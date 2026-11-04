import { z } from "zod";
import { ApiError, type GitHubGraphQL, type GraphQLError, RATE_LIMIT } from "./github.ts";
import type { Candidate } from "./rank.ts";
import type { Found } from "./search.ts";

/**
 * A candidate with what is read during collection but never stored: location (one country per
 * person, post_filter) and status (opt-out / opt-in).
 */
export type Person = Candidate & {
  readonly name: string | null;
  readonly location: string | null;
  readonly status: string | null;
};

const DETAILS = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on User {
      databaseId login name location
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

/** A user's ID and status: everything the opt-out checks read. */
export const statusSchema = z.object({
  databaseId: count,
  status: z.object({ message: z.string().nullable() }).nullable(),
});
/** Status lookups are cheap: this many users per request. */
export const STATUS_BATCH = 50;

const personSchema = statusSchema.extend({
  login: z.string(),
  name: z.string().nullish(),
  location: z.string().nullable(),
  followers: z.object({ totalCount: count }),
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
    name: u.name ?? null,
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
    if (e instanceof ApiError && e.status !== 403 && e.status !== 429) return null;
    throw e;
  }
}

/** More users than allowed never loaded; the country keeps its previous data. */
export class TooManySkippedError extends Error {}

/**
 * Loads contribution details in batches. A heavy batch (RESOURCE_LIMITS_EXCEEDED, 502/504) is halved
 * until it passes; a user that fails alone is skipped; the batch grows back after a success.
 * Nodes are fetched by node ID, so a login renamed since the search still resolves.
 */
export async function fetchPeople(
  client: GitHubGraphQL,
  found: readonly Found[],
  { batchSize, maxSkipped }: { batchSize: number; maxSkipped: number },
): Promise<{ people: Person[]; skipped: number }> {
  const people: Person[] = [];
  let skipped = 0;
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
    // Users deleted, suspended or turned into organizations since the search come back empty: dropped.
    for (const node of nodes) {
      const person = toPerson(node);
      if (person) people.push(person);
    }
    i += batch.length;
    size = Math.min(batchSize, size * 2);
  }
  return { people, skipped };
}

/**
 * Commits per repository, busiest first (only public repositories are visible to the app). One user per request:
 * accounts with this many commits are the heaviest there are, and batches of them time out.
 */
const REPOSITORIES = `query($login: String!) {
  user(login: $login) {
    databaseId
    contributionsCollection {
      commitContributionsByRepository(maxRepositories: 10) {
        contributions { totalCount }
        repository { stargazerCount owner { login } }
      }
    }
  }
  ${RATE_LIMIT}
}`;

const repositoriesSchema = z.object({
  databaseId: count,
  contributionsCollection: z.object({
    commitContributionsByRepository: z.array(
      z.object({
        contributions: z.object({ totalCount: count }),
        repository: z.object({ stargazerCount: count, owner: z.object({ login: z.string() }) }),
      }),
    ),
  }),
});

export type RepoActivity = { readonly quiet: number; readonly popular: number };

/**
 * For accounts with at least min_commits: commits in their busiest own repository with fewer than quiet_stars
 * stars, and in other owners' repositories with at least popular_stars. Best effort: a user that cannot be read
 * (an error, renamed since, a request GitHub gives up on) is left out, and only the commit ratio applies to them.
 * Running out of time or a revoked token still stop the run.
 */
export async function fetchRepoActivity(
  client: GitHubGraphQL,
  people: readonly Person[],
  rule: { readonly min_commits: number; readonly quiet_stars: number; readonly popular_stars: number },
): Promise<{ activity: Map<number, RepoActivity>; failed: number }> {
  const activity = new Map<number, RepoActivity>();
  let pending = people.filter((p) => p.commits >= rule.min_commits);
  // GitHub often gives up (502) on these accounts once and answers the same request a minute later: a second pass
  // after the others gives it that minute.
  for (let pass = 0; pass < 2 && pending.length > 0; pass++) {
    const failedNow: Person[] = [];
    for (const person of pending) {
      const result = await readRepositories(client, person, rule);
      if (result) activity.set(person.id, result);
      else failedNow.push(person);
    }
    pending = failedNow;
  }
  return { activity, failed: pending.length };
}

async function readRepositories(
  client: GitHubGraphQL,
  person: Person,
  rule: { readonly quiet_stars: number; readonly popular_stars: number },
): Promise<RepoActivity | null> {
  let node: unknown = null;
  try {
    const { data } = await client.query<{ user?: unknown }>(REPOSITORIES, { login: person.login });
    node = data?.user ?? null;
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
  }
  const parsed = repositoriesSchema.safeParse(node);
  // The login was read minutes ago; a different account under it now is someone else.
  if (!parsed.success || parsed.data.databaseId !== person.id) return null;
  const own = (login: string) => login.toLowerCase() === person.login.toLowerCase();
  let quiet = 0;
  let popular = 0;
  for (const { contributions, repository } of parsed.data.contributionsCollection.commitContributionsByRepository) {
    const commits = Math.max(0, contributions.totalCount);
    if (own(repository.owner.login) && repository.stargazerCount < rule.quiet_stars) quiet = Math.max(quiet, commits);
    if (!own(repository.owner.login) && repository.stargazerCount >= rule.popular_stars) popular += commits;
  }
  return { quiet, popular };
}

/**
 * Statuses only (cheap): opted-out candidates are not loaded in full, but they must still be able to
 * opt back in. Users that cannot be read keep their opt-out.
 */
export async function fetchStatuses(
  client: GitHubGraphQL,
  found: readonly Found[],
): Promise<Map<number, string | null>> {
  const statuses = new Map<number, string | null>();
  for (let i = 0; i < found.length; i += STATUS_BATCH) {
    const batch = found.slice(i, i + STATUS_BATCH);
    const { data } = await client.query<{ nodes?: unknown[] }>(STATUSES, { ids: batch.map((f) => f.nodeId) });
    for (const node of data?.nodes ?? []) {
      const parsed = statusSchema.safeParse(node);
      if (parsed.success) statuses.set(parsed.data.databaseId, parsed.data.status?.message ?? null);
    }
  }
  return statuses;
}
