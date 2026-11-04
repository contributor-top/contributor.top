import type { APIRoute, GetStaticPaths } from "astro";
import { type CollectedEntry, collected, SITE } from "../../lib/site.ts";

/** Machine-readable ranking per country (like committers.top's rank_only), served as static JSON. */
export const getStaticPaths = (() =>
  collected.map((entry) => ({ params: { country: entry.slug }, props: { entry } }))) satisfies GetStaticPaths;

const strip = (rows: { rank: number; login: string; contributions: number }[]) =>
  rows.map(({ rank, login, contributions }) => ({ rank, login, contributions }));

export const GET: APIRoute<{ entry: CollectedEntry }> = ({ props: { entry } }) => {
  const { data } = entry;
  return Response.json({
    country: entry.title,
    slug: entry.slug,
    updatedAt: data.updatedAt,
    page: `${SITE}/${entry.slug}/`,
    usersWithMatchingLocation: data.totalUsers,
    considered: data.considered,
    minFollowersConsidered: data.minFollowers,
    period: "last 12 months",
    rankings: {
      public: strip(data.tabs.public),
      all: strip(data.tabs.all),
      commits: strip(data.tabs.commits),
    },
    terms: `${SITE}/methodology/#data-access`,
  });
};
