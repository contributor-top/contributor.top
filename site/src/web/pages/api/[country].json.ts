import type { APIRoute, GetStaticPaths } from "astro";
import { type CountryEntry, countryEntries } from "../../lib/site.ts";

/** Machine-readable ranking per country (like committers.top's rank_only), served as static JSON. */
export const getStaticPaths = (() =>
  countryEntries
    .filter((c) => c.data)
    .map((entry) => ({ params: { country: entry.slug }, props: { entry } }))) satisfies GetStaticPaths;

const strip = (rows: { rank: number; login: string; contributions: number }[]) =>
  rows.map(({ rank, login, contributions }) => ({ rank, login, contributions }));

export const GET: APIRoute<{ entry: CountryEntry }> = ({ props, site }) => {
  const { entry } = props;
  const data = entry.data;
  if (!data) return new Response(null, { status: 404 });
  const base = (site?.href ?? "https://contributor.top/").replace(/\/$/, "");
  return Response.json({
    country: entry.title,
    slug: entry.slug,
    updatedAt: data.updatedAt,
    page: `${base}/${entry.slug}/`,
    usersWithMatchingLocation: data.totalUsers,
    considered: data.considered,
    minFollowersConsidered: data.minFollowers,
    period: "last 12 months",
    rankings: {
      public: strip(data.tabs.public),
      all: strip(data.tabs.all),
      commits: strip(data.tabs.commits),
    },
    terms: `${base}/methodology/#data-access`,
  });
};
