import type { APIRoute } from "astro";
import type { Tab } from "../../collector/rank.ts";
import { collected, SITE, TAB_META, tabHref, updates } from "../lib/site.ts";

/** All indexable pages; country pages carry their own update time as lastmod. */
export const GET: APIRoute = () => {
  const newest = updates.at(-1);
  const urls: { loc: string; lastmod?: string | undefined }[] = [
    { loc: "/", lastmod: newest },
    { loc: "/world/", lastmod: newest },
    { loc: "/badge/" },
    { loc: "/methodology/" },
    { loc: "/privacy/" },
  ];
  // "Collecting" pages are thin; they join the sitemap once they have data.
  for (const { slug, data } of collected) {
    for (const tab of Object.keys(TAB_META) as Tab[]) urls.push({ loc: tabHref(slug, tab), lastmod: data.updatedAt });
  }
  const body = urls
    .map(({ loc, lastmod }) => `<url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
