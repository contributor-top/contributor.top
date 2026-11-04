import type { APIRoute } from "astro";
import { collected, SITE } from "../../lib/site.ts";

/** Index of the machine-readable rankings. */
export const GET: APIRoute = () =>
  Response.json({
    description: "The most active GitHub users by country. One JSON file per country.",
    terms: `${SITE}/methodology/#data-access`,
    world: `${SITE}/api/world.json`,
    countries: collected.map((c) => ({
      country: c.title,
      slug: c.slug,
      updatedAt: c.data.updatedAt,
      url: `${SITE}/api/${c.slug}.json`,
    })),
  });
