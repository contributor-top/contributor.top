import type { APIRoute } from "astro";
import type { Tab } from "../../collector/rank.ts";
import { countryEntries, TAB_META } from "../lib/site.ts";

const SITE = "https://contributors.top";

/** All indexable pages; country pages carry their own update time as lastmod. */
export const GET: APIRoute = () => {
  const newest = countryEntries
    .map((c) => c.data?.updatedAt)
    .filter((d): d is string => d !== undefined)
    .sort()
    .at(-1);
  const urls: { loc: string; lastmod?: string | undefined }[] = [
    { loc: "/", lastmod: newest },
    { loc: "/world/", lastmod: newest },
    { loc: "/badge/" },
    { loc: "/methodology/" },
    { loc: "/privacy/" },
  ];
  for (const { slug, data } of countryEntries) {
    if (!data) continue; // "collecting" pages are thin; they join the sitemap once they have data
    for (const tab of Object.keys(TAB_META) as Tab[]) {
      const path = TAB_META[tab].path;
      urls.push({ loc: `/${slug}/${path ? `${path}/` : ""}`, lastmod: data.updatedAt });
    }
  }
  const body = urls
    .map(({ loc, lastmod }) => `<url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`)
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
};
