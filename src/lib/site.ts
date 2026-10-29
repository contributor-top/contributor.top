import { loadConfig } from "../../collector/config.ts";
import type { CountryData, Row } from "../../collector/country-data.ts";
import { loadCountries, presetsDir } from "../../collector/data-dir.ts";
import { loadPresets } from "../../collector/preset.ts";
import type { Tab } from "../../collector/rank.ts";

export const config = loadConfig();
const presets = loadPresets(presetsDir(), config.reserved_slugs);
const countries = new Map(loadCountries().map((c) => [c.slug, c]));

export type CountryEntry = { slug: string; title: string; data: CountryData | null };

/** Every preset is listed; a preset without data yet shows the "collecting" state. */
export const countryEntries: CountryEntry[] = [...presets]
  .map(([slug, preset]) => ({ slug, title: preset.title, data: countries.get(slug) ?? null }))
  .sort((a, b) => a.title.localeCompare(b.title, "en"));

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

export type WorldRow = Row & { country: string };

export function worldRows(): WorldRow[] {
  const best = new Map<number, WorldRow>();
  for (const { data } of countryEntries) {
    if (!data) continue;
    for (const row of data.tabs.public) {
      const current = best.get(row.id);
      if (!current || row.contributions > current.contributions) best.set(row.id, { ...row, country: data.title });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.contributions - a.contributions || a.login.toLowerCase().localeCompare(b.login.toLowerCase()))
    .slice(0, config.ranking.world_top_n)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

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
