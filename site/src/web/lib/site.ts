import { loadConfig } from "../../collector/config.ts";
import type { CountryData } from "../../collector/country-data.ts";
import { listedCountries } from "../../collector/data-dir.ts";
import type { Tab } from "../../collector/rank.ts";
import { type WorldRow, worldRanking } from "../../collector/world.ts";

export const config = loadConfig();
/** The site's address, as in astro.config.mjs, without a trailing slash. */
export const SITE = "https://contributor.top";
const listed = listedCountries(config.reserved_slugs);
const presets = listed.presets;
const countries = new Map(listed.countries.map((c) => [c.slug, c]));

export type CountryEntry = { slug: string; title: string; data: CountryData | null };

/** Every preset is listed; a preset without data yet shows the "collecting" state. */
export const countryEntries: CountryEntry[] = [...presets]
  .map(([slug, preset]) => ({ slug, title: preset.title, data: countries.get(slug) ?? null }))
  .sort((a, b) => a.title.localeCompare(b.title, "en"));

/** Countries that have data: the API, the sitemap and the world ranking. */
export const collected = countryEntries.flatMap(({ data, ...c }) => (data ? [{ ...c, data }] : []));
export type CollectedEntry = (typeof collected)[number];

/**
 * The sizes a ranking of `count` rows offers (one only if the previous one does not show everyone; top_choices is
 * in increasing order, the config schema checks), and the one shown by default.
 */
export function sizesFor(count: number): { choices: number[]; defaultTop: number } {
  const all = config.ranking.top_choices;
  const choices = all.filter((_, i) => i === 0 || (all[i - 1] as number) < count);
  return { choices, defaultTop: Math.min(config.ranking.default_top, choices.at(-1) ?? config.ranking.default_top) };
}

/**
 * A ranking page carries only its smallest size, FIRST_ROWS rows. The rest are fragments, one per step between the
 * sizes (rows 11–50, 51–100, …), at `${rowsBase(key)}${start + 1}/`, fetched only when the chosen size or a
 * #login link needs them.
 */
export const FIRST_ROWS = config.ranking.top_choices[0] ?? 10;
/** Where each fragment of a ranking of `count` rows starts (0-based): at every size smaller than the count. */
export const chunkStarts = (count: number): number[] => config.ranking.top_choices.filter((c) => c < count);
export const rowsBase = (key: string): string => `/rows/${key}/`;
/** The fragments of a ranking: each step after the first rows, with where it starts. */
export function rowSteps<T>(rows: readonly T[]): { start: number; rows: T[] }[] {
  const starts = chunkStarts(rows.length);
  return starts.map((start, i) => ({ start, rows: rows.slice(start, starts[i + 1] ?? rows.length) }));
}

/** Update times of the collected countries, oldest first. */
export const updates = collected.map((c) => c.data.updatedAt).sort();

export const TAB_META: Record<Tab, { label: string; short: string; path: string; note: string }> = {
  public: {
    label: "Public contributions",
    short: "Public",
    path: "",
    note: "Contributions visible to everyone in the last 12 months.",
  },
  all: {
    label: "All contributions",
    short: "All",
    path: "all",
    note: "Public plus private contributions; private ones count only for people who show them on their profile.",
  },
  commits: { label: "Commits", short: "Commits", path: "commits", note: "Public commits in the last 12 months." },
};

/** A country's page for a ranking: /belarus/, /belarus/all/, /belarus/commits/. */
export const tabHref = (slug: string, tab: Tab): string =>
  `/${slug}/${TAB_META[tab].path ? `${TAB_META[tab].path}/` : ""}`;

/** The world ranking from every listed country, without commit farms; the same function builds the world badges. */
export const worldRows = (): WorldRow[] =>
  worldRanking(
    collected.map((c) => c.data),
    config.ranking.world_top_n,
    config.ranking.automated,
  );

/** Display names from every listed country, for the world page (a person listed twice has the same name). */
export const worldNames = (): Record<string, string> => Object.assign({}, ...collected.map((c) => c.data.names ?? {}));

export const formatDate = (iso: string): string =>
  `${new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  })} UTC`;

export const formatNumber = (n: number): string => n.toLocaleString("en-US");
