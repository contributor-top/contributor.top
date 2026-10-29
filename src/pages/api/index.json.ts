import type { APIRoute } from "astro";
import { countryEntries } from "../../lib/site.ts";

/** Index of the machine-readable rankings. */
export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? "https://contributors.top/").replace(/\/$/, "");
  return Response.json({
    description: "The most active GitHub users by country. One JSON file per country.",
    terms: `${base}/methodology/#data-access`,
    world: `${base}/api/world.json`,
    countries: countryEntries
      .filter((c) => c.data)
      .map((c) => ({
        country: c.title,
        slug: c.slug,
        updatedAt: c.data?.updatedAt,
        url: `${base}/api/${c.slug}.json`,
      })),
  });
};
