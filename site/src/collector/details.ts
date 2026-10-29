import { z } from "zod";
import { ApiError, type GitHubGraphQL, type GraphQLError, RATE_LIMIT } from "./github.ts";
import type { Candidate } from "./rank.ts";
import type { Found } from "./search.ts";

/**
 * A candidate with what is read during collection but never stored: location (one country per
 * person, post_filter) and status (opt-out / opt-in).
 */
export type Person = Candidate & { readonly location: string | null; readonly status: string | null };

const DETAILS = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on User {
      databaseId login location
      followers { totalCount }
      status { message }
      contributionsCollection {
        contributionCalendar { totalContributions }
        totalCommitContributions totalPullRequestContributions totalIssueContributions
        totalPullRequestReviewContributions restrictedContributionsCount
      }
    }
  }
  ${RATE_LIMIT}
}`;

const STATUSES = `query($ids: [ID!]!) { nodes(ids: $ids) { ... on User { databaseId status { message } } } ${RATE_LIMIT} }`;

const count = z.number().int();
const personSchema = z.object({
  databaseId: count,
  login: z.string(),
  location: z.string().nullable(),
  followers: z.object({ totalCount: count }),
  status: z.object({ message: z.string().nullable() }).nullable(),
  contributionsCollection: z.object({
    contributionCalendar: z.object({ totalContributions: count }),
    totalCommitContributions: count,
    totalPullRequestContributions: count,
    totalIssueContributions: count,
    totalPullRequestReviewContributions: count,
    restrictedContributionsCount: count,
  }),
});

function toPerson(node: unknown): Person | null {
  const parsed = personSchema.safeParse(node);
  if (!parsed.success) return null;
  const u = parsed.data;
  const c = u.contributionsCollection;
  return {
    id: u.databaseId,
    login: u.login,
    followers: u.followers.totalCount,
    total: c.contributionCalendar.totalContributions,
    restricted: c.restrictedContributionsCount,
    commits: c.totalCommitContributions,
    prs: c.totalPullRequestContributions,
    issues: c.totalIssueContributions,
    reviews: c.totalPullRequestReviewContributions,
    location: u.location,
    status: u.status?.message ?? null,
  };
}

/** Errors that mean "this request was too heavy", not "this user is gone". */
const isHeavy = (e: GraphQLError) =>
  e.type === "RESOURCE_LIMITS_EXCEEDED" || /time(d)? ?out|something went wrong/i.test(e.message);

/** The batch's nodes, or null when the request was too heavy and should be retried smaller. */
async function loadBatch(client: GitHubGraphQL, batch: readonly Found[]): Promise<unknown[] | null> {
  try {
    const { data, errors } = await client.query<{ nodes?: unknown[] }>(DETAILS, { ids: batch.map((f) => f.nodeId) });
    if (errors.some(isHeavy) || !Array.isArray(data?.nodes)) return null;
    return data.nodes;
  } catch (e) {
    if (e instanceof ApiError) return null;
    throw e;
  }
}

/** More users than allowed never loaded; the country keeps its previous data. */
export class TooManySkippedError extends Error {}

export type PeopleResult = {
  readonly people: Person[];
  /** Users that failed even alone (heavy accounts). */
  readonly skipped: number;
  /** Users deleted, suspended or turned into organizations since the search. */
  readonly gone: number;
};

/**
 * Loads contribution details in batches. A heavy batch (RESOURCE_LIMITS_EXCEEDED, 502/504) is halved
 * until it passes; a user that fails alone is skipped; the batch grows back after a success.
 * Nodes are fetched by node ID, so a login renamed since the search still resolves.
 */
export async function fetchPeople(
  client: GitHubGraphQL,
  found: readonly Found[],
  { batchSize, maxSkipped }: { batchSize: number; maxSkipped: number },
): Promise<PeopleResult> {
  const people: Person[] = [];
  let skipped = 0;
  let gone = 0;
  let size = batchSize;
  let i = 0;
  while (i < found.length) {
    const batch = found.slice(i, i + size);
    const nodes = await loadBatch(client, batch);
    if (nodes === null) {
      if (size > 1) {
        size = Math.max(1, Math.floor(size / 2));
        continue;
      }
      skipped++;
      if (skipped > maxSkipped) throw new TooManySkippedError(`more than ${maxSkipped} users failed to load`);
      i++;
      size = batchSize;
      continue;
    }
    for (const node of nodes) {
      const person = toPerson(node);
      if (person) people.push(person);
      else gone++;
    }
    gone += Math.max(0, batch.length - nodes.length);
    i += batch.length;
    size = Math.min(batchSize, size * 2);
  }
  return { people, skipped, gone };
}

const statusSchema = z.object({ databaseId: count, status: z.object({ message: z.string().nullable() }).nullable() });

/**
 * Statuses only (cheap): opted-out candidates are not loaded in full, but they must still be able to
 * opt back in. Users that cannot be read keep their opt-out.
 */
export async function fetchStatuses(
  client: GitHubGraphQL,
  found: readonly Found[],
): Promise<Map<number, string | null>> {
  const statuses = new Map<number, string | null>();
  for (let i = 0; i < found.length; i += 50) {
    const batch = found.slice(i, i + 50);
    const { data } = await client.query<{ nodes?: unknown[] }>(STATUSES, { ids: batch.map((f) => f.nodeId) });
    for (const node of data?.nodes ?? []) {
      const parsed = statusSchema.safeParse(node);
      if (parsed.success) statuses.set(parsed.data.databaseId, parsed.data.status?.message ?? null);
    }
  }
  return statuses;
}
