import type { APIRoute } from "astro";
import { countryEntries, worldRows } from "../../lib/site.ts";

/** Machine-readable world ranking: merged from every country, public contributions. */
export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? "https://contributor.top/").replace(/\/$/, "");
  const updated = countryEntries
    .map((c) => c.data?.updatedAt)
    .filter((d): d is string => d !== undefined)
    .sort();
  return Response.json({
    ranking: "world",
    description:
      "Merged from all country rankings by public contributions; only people whose location matches a country.",
    page: `${base}/world/`,
    oldestCountryUpdate: updated[0] ?? null,
    newestCountryUpdate: updated.at(-1) ?? null,
    period: "last 12 months",
    rankings: {
      public: worldRows().map(({ rank, login, contributions, country }) => ({ rank, login, contributions, country })),
    },
    terms: `${base}/methodology/#data-access`,
  });
};
