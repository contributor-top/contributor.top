import type { Config } from "./config.ts";
import { type CountryData, countryDataSchema } from "./country-data.ts";
import { fetchPeople, fetchRepoActivity, fetchStatuses, type Person, type RepoActivity } from "./details.ts";
import { hasEnoughPublic } from "./flags.ts";
import type { GitHubGraphQL } from "./github.ts";
import { decide, optoutHash } from "./optout.ts";
import { type Preset, presetChecksum } from "./preset.ts";
import { rank, TABS, type Tab } from "./rank.ts";
import { type Found, findCandidates } from "./search.ts";
import { countsFor, mentions } from "./stuffing.ts";

export type OptoutList = { readonly key: string; readonly hashes: ReadonlySet<string> };

type CountryStats = {
  readonly candidates: number;
  /** Users that failed to load even alone (heavy accounts). */
  readonly skipped: number;
  readonly denied: number;
  readonly otherCountry: number;
  readonly postFiltered: number;
  /** Accounts above ranking.automated.min_commits whose repositories could not be read (only the ratio applies). */
  readonly repoFailed: number;
};

export type CountryResult = {
  readonly data: CountryData;
  /** New opt-outs, with IDs so every other country can be purged right away. */
  readonly optedOut: { readonly id: number; readonly hash: string }[];
  /** Hashes to drop from the opt-out list: these people asked to come back. */
  readonly optedIn: string[];
  /** Counts only: safe for public logs. */
  readonly stats: CountryStats;
};

/** post_filter: drop people whose location has an include term together with a banned substring. */
function isPostFiltered(preset: Preset, location: string | null): boolean {
  if (!preset.post_filter || !location) return false;
  const lower = location.toLowerCase();
  return Object.entries(preset.post_filter).some(
    ([term, banned]) => mentions(location, term) && banned.some((b) => lower.includes(b.toLowerCase())),
  );
}

type Meta = {
  topN: number;
  /** ranking.min_public_share: the least public share to appear in the "all" ranking. */
  minPublicShare: number;
  updatedAt: string;
  totalUsers: number;
  threshold: number;
  repos: ReadonlyMap<number, RepoActivity>;
};

/** Public and private contributions together rank only people with enough public ones (ranking.min_public_share). */
const enoughPublic = (p: Person, minShare: number) =>
  hasEnoughPublic(TABS.public(p), Math.max(0, p.restricted), minShare);

function toCountryData(slug: string, preset: Preset, people: readonly Person[], meta: Meta): CountryData {
  const tabs = Object.fromEntries(
    (Object.keys(TABS) as Tab[]).map((tab) => [
      tab,
      rank(tab === "all" ? people.filter((p) => enoughPublic(p, meta.minPublicShare)) : people, TABS[tab], meta.topN),
    ]),
  ) as Record<Tab, ReturnType<typeof rank>>;
  // Only people who appear in a ranking are published; the rest of the candidates leave no trace.
  const ranked = new Set(Object.values(tabs).flatMap((rows) => rows.map((r) => r.id)));
  const shown = people.filter((p) => ranked.has(p.id));
  const breakdown = Object.fromEntries(
    shown.map((p) => [
      String(p.id),
      {
        commits: Math.max(0, p.commits),
        prs: Math.max(0, p.prs),
        issues: Math.max(0, p.issues),
        reviews: Math.max(0, p.reviews),
        private: Math.max(0, p.restricted),
        ...meta.repos.get(p.id),
      },
    ]),
  );
  return countryDataSchema.parse({
    slug,
    title: preset.title,
    updatedAt: meta.updatedAt,
    totalUsers: meta.totalUsers,
    considered: people.length,
    minFollowers: meta.threshold,
    presetChecksum: presetChecksum(preset),
    tabs,
    breakdown,
  });
}

type Run = {
  readonly client: GitHubGraphQL;
  readonly slug: string;
  readonly preset: Preset;
  readonly presets: ReadonlyMap<string, Preset>;
  readonly config: Config;
  readonly hashOf: (id: number) => string;
};

const decision = (run: Run, status: string | null | undefined) =>
  decide(status, run.config.privacy.optout_phrase, run.config.privacy.optin_phrase);

/**
 * Splits candidates into people to load and opted-out people. Opted-out people are not loaded in full,
 * but their status is read so they can come back with the opt-in phrase.
 */
async function admit(run: Run, found: readonly Found[], hashes: ReadonlySet<string>) {
  const denylist = new Set(run.config.denylist_ids);
  const active: Found[] = [];
  const excluded: Found[] = [];
  let denied = 0;
  for (const f of found) {
    if (denylist.has(f.id)) denied++;
    else if (hashes.has(run.hashOf(f.id))) excluded.push(f);
    else active.push(f);
  }
  const optedIn: string[] = [];
  if (excluded.length > 0) {
    const statuses = await fetchStatuses(run.client, excluded);
    for (const f of excluded) {
      if (decision(run, statuses.get(f.id)) !== "opt-in") continue;
      optedIn.push(run.hashOf(f.id));
      active.push(f);
    }
  }
  return { active, optedIn, denied };
}

/** Opt-out by status, one country per person, post_filter. */
function sift(run: Run, people: readonly Person[]) {
  const optedOut: { id: number; hash: string }[] = [];
  const kept: Person[] = [];
  let otherCountry = 0;
  let postFiltered = 0;
  for (const person of people) {
    if (decision(run, person.status) === "opt-out") optedOut.push({ id: person.id, hash: run.hashOf(person.id) });
    else if (!countsFor(run.slug, person.location, run.presets)) otherCountry++;
    else if (isPostFiltered(run.preset, person.location)) postFiltered++;
    else kept.push(person);
  }
  return { optedOut, kept, otherCountry, postFiltered };
}

/**
 * Collects one country: candidates by follower threshold, opt-out/opt-in by status, details,
 * one country per person (the first one their location mentions), post_filter, three rankings.
 * Logins and locations never leave this function except in the validated data.
 */
export async function collectCountry(
  client: GitHubGraphQL,
  {
    slug,
    presets,
    config,
    optout,
    now,
  }: {
    slug: string;
    presets: ReadonlyMap<string, Preset>;
    config: Config;
    optout: OptoutList;
    now: Date;
  },
): Promise<CountryResult> {
  const preset = presets.get(slug);
  if (!preset) throw new Error(`unknown country ${slug}`);
  const run: Run = { client, slug, preset, presets, config, hashOf: (id) => optoutHash(id, optout.key) };

  const { totalUsers, threshold, found } = await findCandidates(client, preset, config.ranking.consider);
  const { active, optedIn, denied } = await admit(run, found, optout.hashes);
  const { people, skipped } = await fetchPeople(client, active, {
    batchSize: config.collector.batch_size,
    maxSkipped: config.collector.max_skipped_per_country,
  });
  const { optedOut, kept, otherCountry, postFiltered } = sift(run, people);
  const repos = await fetchRepoActivity(client, kept, config.ranking.automated);

  const data = toCountryData(slug, preset, kept, {
    topN: config.ranking.top_n,
    minPublicShare: config.ranking.min_public_share,
    updatedAt: now.toISOString(),
    totalUsers,
    threshold,
    repos: repos.activity,
  });
  const stats = { candidates: found.length, skipped, denied, otherCountry, postFiltered, repoFailed: repos.failed };
  return { data, optedOut, optedIn, stats };
}
