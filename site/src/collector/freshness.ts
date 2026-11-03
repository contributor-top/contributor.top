// Which countries are too old: the collector's alert (freshness.stale_days) and its status check (target_hours).

export type Dated = { readonly slug: string; readonly title: string; readonly updatedAt: string };
export type Stale = { readonly slug: string; readonly title: string; readonly hours: number };

const HOUR = 3_600_000;

/** Countries whose data is older than `hours`, oldest first; an unreadable date counts as old. */
export function olderThan(countries: readonly Dated[], now: Date, hours: number): Stale[] {
  return countries
    .map((c) => ({ slug: c.slug, title: c.title, hours: (now.getTime() - Date.parse(c.updatedAt)) / HOUR }))
    .filter((c) => !(c.hours <= hours))
    .map((c) => ({ ...c, hours: Number.isNaN(c.hours) ? Number.POSITIVE_INFINITY : Math.floor(c.hours) }))
    .sort((a, b) => b.hours - a.hours || (a.slug < b.slug ? -1 : 1));
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
