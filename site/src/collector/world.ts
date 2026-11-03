import type { CountryData, Row } from "./country-data.ts";

export type WorldRow = Row & { country: string };

/** Code-point order: the same on every machine, unlike localeCompare (and the same rule as rank.ts). */
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The world ranking: every person once, with their best public-contributions row across countries, then
 * re-ranked. Deterministic whatever order the countries come in, so the /world/ page and the world badges,
 * built by separate processes, always agree: equal counts go to the alphabetically first country, equal
 * contributions are ordered by lowercase login, then by id.
 */
export function worldRanking(countries: readonly CountryData[], topN: number): WorldRow[] {
  const best = new Map<number, WorldRow>();
  for (const data of countries) {
    for (const row of data.tabs.public) {
      const current = best.get(row.id);
      const better =
        !current ||
        row.contributions > current.contributions ||
        (row.contributions === current.contributions && byCodePoint(data.title, current.country) < 0);
      if (better) best.set(row.id, { ...row, country: data.title });
    }
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        b.contributions - a.contributions || byCodePoint(a.login.toLowerCase(), b.login.toLowerCase()) || a.id - b.id,
    )
    .slice(0, Math.max(0, topN))
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
