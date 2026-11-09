// An in-memory GitHub GraphQL API for tests: user search with location/followers/type qualifiers,
// pagination and the 1000-result cap, node lookups, rate-limit info and injectable failures.
import type { Clock, FetchLike, HttpResponse } from "../src/collector/github.ts";

export type FakeUser = {
  id: number;
  login: string;
  location: string | null;
  followers: number;
  status?: string | null;
  total?: number;
  restricted?: number;
  commits?: number;
  prs?: number;
  issues?: number;
  reviews?: number;
  org?: boolean;
  /** Commits per repository, busiest first (commitContributionsByRepository). */
  repos?: { owner: string; stars: number; commits: number; orgTopStars?: number }[];
  /** The repository request for this user always fails with a 502. */
  reposFail?: boolean;
};

export type RawResponse = { status: number; body: string; headers?: Record<string, string> };

/** Independent of the collector's own matcher: GitHub matches location terms as whole words. */
const tokens = (s: string) =>
  s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
function hasPhrase(location: string, term: string): boolean {
  const hay = tokens(location);
  const needle = tokens(term);
  return hay.some((_, i) => needle.every((t, j) => hay[i + j] === t));
}

type Search = { include: string[]; exclude: string[]; min: number; max: number; usersOnly: boolean };

function parseSearch(q: string): Search {
  const search: Search = { include: [], exclude: [], min: 0, max: Number.POSITIVE_INFINITY, usersOnly: false };
  for (const [, neg, key, value] of q.matchAll(/(-?)([a-z]+):("[^"]*"|\S+)/g)) {
    const v = (value as string).replace(/^"|"$/g, "");
    if (key === "location") (neg ? search.exclude : search.include).push(v);
    else if (key === "type") search.usersOnly = v === "user";
    else if (key === "followers") {
      const range = v.match(/^(\d+)\.\.(\d+)$/);
      if (range) [search.min, search.max] = [Number(range[1]), Number(range[2])];
      else search.min = Number(v.replace(">=", ""));
    }
  }
  return search;
}

const nodeId = (id: number) => `U_${id}`;

export class FakeGitHub {
  readonly calls: { kind: "count" | "page" | "details" | "statuses" | "repos"; size: number }[] = [];
  /** The text of every GraphQL query, to check what the collector asks GitHub for. */
  readonly queries: string[] = [];
  /** Raw responses served before normal handling, one per request (status codes, broken bodies). */
  readonly queued: RawResponse[] = [];
  /** Detail requests with more IDs than this fail as RESOURCE_LIMITS_EXCEEDED. */
  heavyAbove = Number.POSITIVE_INFINITY;
  /** These users make any detail request that contains them fail. */
  readonly heavyIds = new Set<number>();
  /** Users counted by search but never returned in result pages (suspended since indexing). */
  readonly hiddenFromPages = new Set<number>();
  remaining = 5000;
  readonly limit = 5000;
  resetAt = new Date(Date.UTC(2026, 9, 29, 13)).toISOString();

  constructor(readonly users: FakeUser[]) {}

  readonly fetch: FetchLike = async (_url, init) => {
    const raw = this.queued.shift() ?? this.handle(JSON.parse(init.body ?? "{}"));
    return response(raw);
  };

  private rateLimit() {
    this.remaining = Math.max(0, this.remaining - 1);
    return { cost: 1, limit: this.limit, remaining: this.remaining, resetAt: this.resetAt };
  }

  private matches(search: Search): FakeUser[] {
    return this.users.filter(
      (u) =>
        (!search.usersOnly || !u.org) &&
        u.followers >= search.min &&
        u.followers <= search.max &&
        u.location !== null &&
        search.include.some((t) => hasPhrase(u.location as string, t)) &&
        !search.exclude.some((t) => hasPhrase(u.location as string, t)),
    );
  }

  private handle(body: { query: string; variables: Record<string, unknown> }): RawResponse {
    const { query, variables } = body;
    this.queries.push(query);
    if (query.includes("nodes(ids")) return this.nodes(query, variables["ids"] as string[]);
    if (query.includes("user(login")) return this.repos(variables["login"] as string);
    const matched = this.matches(parseSearch(variables["q"] as string));
    if (query.includes("first: 0")) {
      this.calls.push({ kind: "count", size: 0 });
      return json({ data: { search: { userCount: matched.length }, rateLimit: this.rateLimit() } });
    }
    // GitHub's order is "best match", not followers: scramble it so nothing can rely on order.
    const reachable = matched
      .filter((u) => !this.hiddenFromPages.has(u.id))
      .sort((a, b) => ((a.id * 7919) % 1009) - ((b.id * 7919) % 1009) || a.id - b.id)
      .slice(0, 1000);
    const offset = Number(variables["after"] ?? 0);
    const page = reachable.slice(offset, offset + 100);
    this.calls.push({ kind: "page", size: page.length });
    const next = offset + 100 < reachable.length;
    return json({
      data: {
        search: {
          userCount: matched.length,
          pageInfo: { hasNextPage: next, endCursor: next ? String(offset + 100) : null },
          nodes: page.map((u) =>
            u.org ? {} : { id: nodeId(u.id), databaseId: u.id, login: u.login, followers: { totalCount: u.followers } },
          ),
        },
        rateLimit: this.rateLimit(),
      },
    });
  }

  private repos(login: string): RawResponse {
    this.calls.push({ kind: "repos", size: 1 });
    const u = this.users.find((x) => x.login.toLowerCase() === login.toLowerCase() && !x.org);
    if (u?.reposFail) return { status: 502, body: "bad gateway" };
    const user = u && {
      databaseId: u.id,
      contributionsCollection: {
        commitContributionsByRepository: (u.repos ?? []).map((r) => ({
          contributions: { totalCount: r.commits },
          repository: {
            stargazerCount: r.stars,
            owner: {
              login: r.owner,
              ...(r.orgTopStars === undefined ? {} : { repositories: { nodes: [{ stargazerCount: r.orgTopStars }] } }),
            },
          },
        })),
      },
    };
    return json({ data: { user: user ?? null, rateLimit: this.rateLimit() } });
  }

  private nodes(query: string, ids: string[]): RawResponse {
    const full = query.includes("contributionsCollection");
    this.calls.push({ kind: full ? "details" : "statuses", size: ids.length });
    const users = ids.map((id) => this.users.find((u) => nodeId(u.id) === id));
    if (full && (ids.length > this.heavyAbove || users.some((u) => u && this.heavyIds.has(u.id)))) {
      return json({ data: null, errors: [{ type: "RESOURCE_LIMITS_EXCEEDED", message: "Resource limits exceeded" }] });
    }
    const nodes = users.map((u) => {
      if (!u) return null;
      if (u.org) return {};
      const status = u.status === undefined || u.status === null ? null : { message: u.status };
      if (!full) return { databaseId: u.id, status };
      return {
        databaseId: u.id,
        login: u.login,
        location: u.location,
        followers: { totalCount: u.followers },
        status,
        contributionsCollection: {
          contributionCalendar: { totalContributions: u.total ?? 0 },
          totalCommitContributions: u.commits ?? 0,
          totalPullRequestContributions: u.prs ?? 0,
          totalIssueContributions: u.issues ?? 0,
          totalPullRequestReviewContributions: u.reviews ?? 0,
          restrictedContributionsCount: u.restricted ?? 0,
        },
      };
    });
    return json({ data: { nodes, rateLimit: this.rateLimit() } });
  }
}

export const json = (value: unknown, status = 200, headers: Record<string, string> = {}): RawResponse => ({
  status,
  body: JSON.stringify(value),
  headers,
});

export function response(raw: RawResponse): HttpResponse {
  const headers = Object.fromEntries(Object.entries(raw.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    status: raw.status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => raw.body,
  };
}

/** A clock that only moves when the code sleeps; every sleep is recorded. */
export function fakeClock(start = Date.UTC(2026, 9, 29, 12)): Clock & { sleeps: number[]; time: () => number } {
  let now = start;
  const sleeps: number[] = [];
  return {
    sleeps,
    time: () => now,
    now: () => now,
    sleep: async (ms) => {
      sleeps.push(ms);
      now += ms;
    },
  };
}
