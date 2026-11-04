import type { APIRoute } from "astro";
import { SITE, updates, worldRows } from "../../lib/site.ts";

/** Machine-readable world ranking: merged from every country, public contributions. */
export const GET: APIRoute = () =>
  Response.json({
    ranking: "world",
    description:
      "Merged from all country rankings by public contributions; only people whose location matches a country.",
    page: `${SITE}/world/`,
    oldestCountryUpdate: updates[0] ?? null,
    newestCountryUpdate: updates.at(-1) ?? null,
    period: "last 12 months",
    rankings: {
      public: worldRows().map(({ rank, login, contributions, country }) => ({ rank, login, contributions, country })),
    },
    terms: `${SITE}/methodology/#data-access`,
  });
