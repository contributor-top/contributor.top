// A step of a ranking's rows (11–50, 51–100, …) as a bare fragment (no <html>, no <head>), at
// /rows/<ranking>/<first rank of the step>/: the ranking page fetches it only when the chosen size or a #login link
// needs it. Not a page (robots.txt keeps it out). An endpoint rather than a page, so it is built once, in English,
// for every language (ranking.js translates it on a page in another one); pages are built once per language.
import type { APIRoute, GetStaticPaths } from "astro";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import type { Tab } from "../../../../collector/rank.ts";
import RankingRows from "../../../components/RankingRows.astro";
import { collected, rowSteps, TABS, worldNames, worldRows } from "../../../lib/site.ts";

export const getStaticPaths = (() => [
  ...collected.flatMap(({ slug, data }) =>
    TABS.flatMap((tab) =>
      rowSteps(data.tabs[tab]).map(({ start, rows }) => ({
        params: { key: `${slug}/${tab}/${start + 1}` },
        props: { rows, breakdown: data.breakdown, names: data.names, tab },
      })),
    ),
  ),
  ...rowSteps(worldRows()).map(({ start, rows }) => ({
    params: { key: `world/${start + 1}` },
    props: { rows, breakdown: undefined, names: worldNames(), tab: "public" as Tab },
  })),
]) satisfies GetStaticPaths;

const container = AstroContainer.create();

export const GET: APIRoute = async ({ props }) =>
  new Response(await (await container).renderToString(RankingRows, { props, partial: true }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
