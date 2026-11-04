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
