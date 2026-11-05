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

/** A country: its slug, English title (the preset's), ISO code (names it in other languages) and data, if any. */
export type CountryEntry = { slug: string; title: string; iso: string | null; data: CountryData | null };

/** Every preset is listed; a preset without data yet shows the "collecting" state. */
export const countryEntries: CountryEntry[] = [...presets]
  .map(([slug, preset]) => ({ slug, title: preset.title, iso: preset.iso, data: countries.get(slug) ?? null }))
  .sort((a, b) => a.title.localeCompare(b.title, "en"));

/** A country by its English title, as the world ranking names it (a bare title if no preset has it). */
const byTitle = new Map(countryEntries.map((c) => [c.title, c]));
export const countryByTitle = (title: string): CountryEntry =>
  byTitle.get(title) ?? { slug: "", title, iso: null, data: null };

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

/** Each ranking's path under a country (its texts are in i18n: tab.public, tab.all, tab.commits). */
export const TAB_PATHS: Record<Tab, string> = { public: "", all: "all", commits: "commits" };
export const TABS = Object.keys(TAB_PATHS) as Tab[];

/** A country's page for a ranking: /belarus/, /belarus/all/, /belarus/commits/. */
export const tabHref = (slug: string, tab: Tab): string => `/${slug}/${TAB_PATHS[tab] ? `${TAB_PATHS[tab]}/` : ""}`;

/** The world ranking from every listed country, without commit farms; the same function builds the world badges. */
export const worldRows = (): WorldRow[] =>
  worldRanking(
    collected.map((c) => c.data),
    config.ranking.world_top_n,
    config.ranking.automated,
  );

/** Display names from every listed country, for the world page (a person listed twice has the same name). */
export const worldNames = (): Record<string, string> => Object.assign({}, ...collected.map((c) => c.data.names ?? {}));
