// Which countries are too old: the collector's alert (freshness.stale_days) and its status check (target_hours).
import { byCodePoint } from "./rank.ts";

export type Dated = { readonly slug: string; readonly title: string; readonly updatedAt: string };
export type Stale = { readonly slug: string; readonly title: string; readonly hours: number };

export const HOUR = 3_600_000;

/** How old the data is; an unreadable date counts as infinitely old rather than blocking the country forever. */
export function ageMs(updatedAt: string, now: Date): number {
  const age = now.getTime() - Date.parse(updatedAt);
  return Number.isNaN(age) ? Number.POSITIVE_INFINITY : age;
}

/** Countries whose data is older than `hours`, oldest first. */
export function olderThan(countries: readonly Dated[], now: Date, hours: number): Stale[] {
  return countries
    .map((c) => ({ c, age: ageMs(c.updatedAt, now) }))
    .filter(({ age }) => age > hours * HOUR)
    .map(({ c, age }) => ({ slug: c.slug, title: c.title, hours: Math.floor(age / HOUR) }))
    .sort((a, b) => b.hours - a.hours || byCodePoint(a.slug, b.slug));
}

/** Countries older than stale_days: the alert. */
export const staleCountries = (countries: readonly Dated[], now: Date, staleDays: number): Stale[] =>
  olderThan(countries, now, staleDays * 24);

const age = (hours: number): string =>
  Number.isFinite(hours) ? `${Math.floor(hours / 24)} d ${hours % 24} h` : "unknown (unreadable date)";

/** The alert issue's body: slugs, titles and ages only, no person. */
export function staleReport(stale: readonly Stale[], staleDays: number): string {
  return [
    `${stale.length} ${stale.length === 1 ? "country has" : "countries have"} not been updated for more than ${staleDays} days.`,
    "",
    "| Country | Age |",
    "| --- | --- |",
    ...stale.map((s) => `| ${s.title} (\`${s.slug}\`) | ${age(s.hours)} |`),
    "",
    // One line per paragraph: GitHub renders every newline in an issue as a line break.
    "Check the latest `update` runs: a country that keeps failing or is held back by the circuit breaker shows up " +
      "in the run summary. This issue is updated after every run and closes itself once every country is fresh again.",
  ].join("\n");
}
