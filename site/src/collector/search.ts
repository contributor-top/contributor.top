import { z } from "zod";
import { type GitHubGraphQL, RATE_LIMIT } from "./github.ts";
import type { Preset } from "./preset.ts";
import { buildQuery, withFollowers } from "./query.ts";
import { type CountFn, findThreshold, SEARCH_CAP, splitRanges } from "./threshold.ts";

/** A candidate as search returns it: enough to pick the most-followed, nothing else. */
export type Found = {
  readonly id: number;
  readonly nodeId: string;
  readonly login: string;
  readonly followers: number;
};

const COUNT = `query($q: String!) { search(type: USER, query: $q, first: 0) { userCount } ${RATE_LIMIT} }`;
const PAGE = `query($q: String!, $after: String) {
  search(type: USER, query: $q, first: 100, after: $after) {
    userCount
    pageInfo { hasNextPage endCursor }
    nodes { ... on User { id databaseId login followers { totalCount } } }
  }
  ${RATE_LIMIT}
}`;

const countSchema = z.object({ search: z.object({ userCount: z.number() }) });
// Organizations and other non-user nodes come back as {} and are skipped.
const nodeSchema = z.union([
  z.object({
    id: z.string(),
    databaseId: z.number().int(),
    login: z.string(),
    followers: z.object({ totalCount: z.number().int() }),
  }),
  z.object({}).strict(),
]);
const pageSchema = z.object({
  search: z.object({
    userCount: z.number(),
    pageInfo: z.object({ hasNextPage: z.boolean(), endCursor: z.string().nullable() }),
    nodes: z.array(nodeSchema.nullable()),
  }),
});

/** The search did not return what it promised; the country keeps its previous data. */
export class IncompleteSearchError extends Error {}

async function run<T>(client: GitHubGraphQL, query: string, variables: Record<string, unknown>, schema: z.ZodType<T>) {
  const { data, errors } = await client.query<unknown>(query, variables);
  if (errors.length > 0) throw new IncompleteSearchError(`search failed: ${errors.map((e) => e.message).join("; ")}`);
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new IncompleteSearchError("search returned an unexpected shape");
  return parsed.data;
}

const userCount = async (client: GitHubGraphQL, q: string): Promise<number> =>
  (await run(client, COUNT, { q }, countSchema)).search.userCount;

/** All users of one query, page by page; the query must match at most SEARCH_CAP users. */
async function searchAll(client: GitHubGraphQL, q: string): Promise<{ users: Found[]; expected: number }> {
  const users: Found[] = [];
  let after: string | null = null;
  let expected = 0;
  for (let page = 0; page < SEARCH_CAP / 100; page++) {
    const { search }: z.infer<typeof pageSchema> = await run(client, PAGE, { q, after }, pageSchema);
    expected = search.userCount;
    for (const node of search.nodes) {
      if (node && "login" in node) {
        users.push({ id: node.databaseId, nodeId: node.id, login: node.login, followers: node.followers.totalCount });
      }
    }
    if (!search.pageInfo.hasNextPage || !search.pageInfo.endCursor) break;
    after = search.pageInfo.endCursor;
  }
  return { users, expected };
}

/**
 * Users found per range may fall a little short of userCount (accounts suspended since indexing);
 * more than this share missing means the search is unreliable right now.
 */
const MAX_MISSING_SHARE = 0.05;

export type Candidates = {
  /** Everyone matching the preset, before the follower threshold. */
  readonly totalUsers: number;
  /** Smallest follower count that keeps at most `consider` candidates. */
  readonly threshold: number;
  /** The most-followed users (at most `consider`), each once. */
  readonly found: Found[];
};

/**
 * Finds the `consider` most-followed users of a preset without trusting search order (#112):
 * bisect a follower threshold on userCount, then page through follower ranges of < 1000 users.
 */
export async function findCandidates(client: GitHubGraphQL, preset: Preset, consider: number): Promise<Candidates> {
  const base = buildQuery(preset);
  const count: CountFn = (range) => userCount(client, withFollowers(base, range));
  const totalUsers = await count({ min: 0, max: null });
  const threshold = await findThreshold(count, consider);
  const byId = new Map<number, Found>();
  for (const range of await splitRanges(count, threshold)) {
    const { users, expected } = await searchAll(client, withFollowers(base, range));
    const reachable = Math.min(expected, SEARCH_CAP);
    if (users.length < reachable * (1 - MAX_MISSING_SHARE)) {
      throw new IncompleteSearchError(`search returned ${users.length} of ${reachable} users`);
    }
    for (const user of users) byId.set(user.id, user);
  }
  // Counts can move while we page; keep the most-followed, deterministically.
  const found = [...byId.values()].sort((a, b) => b.followers - a.followers || a.id - b.id).slice(0, consider);
  return { totalUsers, threshold, found };
}
