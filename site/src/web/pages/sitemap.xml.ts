import type { APIRoute } from "astro";
import { LANGS, prefixOf } from "../i18n/index.ts";
import { collected, SITE, TABS, tabHref, updates } from "../lib/site.ts";

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
  // "Collecting" pages are thin; they join the sitemap once they have data.
  for (const { slug, data } of collected) {
    for (const tab of TABS) pages.push({ loc: tabHref(slug, tab), lastmod: data.updatedAt });
  }
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
