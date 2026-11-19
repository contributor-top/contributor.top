import type { APIRoute } from "astro";
import { LANGS, prefixOf } from "../i18n/index.ts";
import { collected, SITE, tabHref, updates } from "../lib/site.ts";

/**
 * All indexable pages, in every language; country pages carry their own update time as lastmod. The pages name
 * their other languages themselves (hreflang in <head>), so the sitemap only lists them.
 */
export const GET: APIRoute = () => {
  const newest = updates.at(-1);
  const pages: { loc: string; lastmod?: string | undefined }[] = [
    { loc: "/", lastmod: newest },
    { loc: "/world/", lastmod: newest },
    { loc: "/badge/" },
    { loc: "/methodology/" },
    { loc: "/privacy/" },
  ];
  // "Collecting" pages are thin; they join the sitemap once they have data. Only the main ranking of a country is
  // listed: the other tabs rank the same people differently, so they would ask a young site's small crawl budget for
  // near-duplicates (#180). They stay indexable and reachable through the tab links on every page.
  for (const { slug, data } of collected) pages.push({ loc: tabHref(slug, "public"), lastmod: data.updatedAt });
  const body = LANGS.flatMap((lang) =>
    pages.map(
      ({ loc, lastmod }) =>
        `<url><loc>${SITE}${prefixOf(lang)}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`,
    ),
  ).join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
