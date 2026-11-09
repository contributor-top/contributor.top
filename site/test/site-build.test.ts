// Integration: builds the whole site from hostile data and inspects the output.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOGIN, SLUG } from "../src/collector/patterns.ts";
import { inlineScript } from "../src/web/lib/inline.ts";

// On the project's disk, not in the system temp directory: Astro moves built files into the output with rename(),
// which fails (EXDEV) where /tmp is another file system, as on some CI runners.
const cache = join("node_modules", ".cache");
mkdirSync(cache, { recursive: true });
const root = mkdtempSync(join(cache, "ct-site-"));
const out = join(root, "dist");
const presetsDir = join(root, "presets");
const dataDir = join(root, "data");

const row = (rank: number, login: string, id: number, contributions: number) => ({ rank, login, id, contributions });
const country = (slug: string, title: string, rows: ReturnType<typeof row>[]) => ({
  slug,
  title,
  updatedAt: "2026-10-28T12:00:00.000Z",
  totalUsers: 100,
  considered: rows.length,
  minFollowers: 3,
  tabs: { public: rows, all: rows, commits: rows },
  breakdown: Object.fromEntries(rows.map((r) => [r.id, { commits: 1, prs: 2, issues: 3, reviews: 4, private: 0 }])),
});

/** Built HTML documents: every page, without the row fragments (pages/rows). */
const documents = () => files(out).filter((f) => f.endsWith(".html") && !f.startsWith(join(out, "rows")));

/** An inline script as the pages carry it: minified from its source file. */
const embedded = (name: string) => inlineScript(name, readFileSync(`src/web/scripts/${name}.js`, "utf8"));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

afterAll(() => rmSync(root, { recursive: true, force: true }));

beforeAll(() => {
  mkdirSync(presetsDir);
  mkdirSync(join(dataDir, "countries"), { recursive: true });
  writeFileSync(
    join(presetsDir, "cote_divoire.yml"),
    'title: Côte d\'Ivoire\niso: "CI"\ninclude: [abidjan]\nexclude: []\n',
  );
  writeFileSync(
    join(presetsDir, "congo_kinshasa.yml"),
    'title: Congo (Kinshasa)\niso: "CD"\ninclude: [kinshasa]\nexclude: []\n',
  );
  writeFileSync(join(presetsDir, "empty_land.yml"), "title: Empty Land\niso: null\ninclude: [nowhere]\nexclude: []\n");
  writeFileSync(join(presetsDir, "no_data.yml"), "title: No Data\niso: null\ninclude: [nodata]\nexclude: []\n");
  const ci = country("cote_divoire", "Côte d'Ivoire", [
    row(1, "farm-bot", 13, 900000),
    row(2, "Octo-Cat", 11, 50),
    row(3, "zed", 12, 40),
    row(4, "quiet-farm", 14, 30),
  ]);
  // A commit farm: almost nothing but commits. It stays in its country, marked, and is left out of the world.
  ci.breakdown["13"] = { commits: 900000, prs: 1, issues: 0, reviews: 0, private: 0 };
  // Pull requests enough for the ratio, but three quarters of the commits in one repository of its own nobody stars;
  // almost everything else it does is private.
  Object.assign(ci.breakdown, {
    14: { commits: 40000, prs: 2000, issues: 0, reviews: 0, private: 400000, quiet: 30000, popular: 0 },
  });
  // A maintainer committing straight to a widely used project: few pull requests, but not automated.
  Object.assign(ci.breakdown, {
    12: { commits: 30000, prs: 0, issues: 0, reviews: 0, private: 0, quiet: 0, popular: 29000 },
  });
  // A display name, as files collected in Nov 2026 still carry: valid, but shown nowhere.
  Object.assign(ci, { names: { "11": "<b>Octo</b> & Cat" } });
  const cd = country("congo_kinshasa", "Congo (Kinshasa)", [row(1, "octo-cat", 11, 90)]);
  writeFileSync(join(dataDir, "countries", "cote_divoire.json"), JSON.stringify(ci));
  writeFileSync(join(dataDir, "countries", "congo_kinshasa.json"), JSON.stringify(cd));
  writeFileSync(join(dataDir, "countries", "empty_land.json"), JSON.stringify(country("empty_land", "Empty Land", [])));
  // More rows than the smallest size: the page carries 10, the rest are fragments loaded on demand.
  writeFileSync(join(presetsDir, "big_land.yml"), "{ title: Big Land, iso: null, include: [bigtown], exclude: [] }");
  const big = Array.from({ length: 60 }, (_, i) => row(i + 1, `big-${i + 1}`, 1000 + i, 30 - Math.floor(i / 2)));
  writeFileSync(join(dataDir, "countries", "big_land.json"), JSON.stringify(country("big_land", "Big Land", big)));
  // Data left over from a removed preset: no page, so no badge may link to it.
  writeFileSync(
    join(dataDir, "countries", "orphan.json"),
    JSON.stringify(country("orphan", "Orphan", [row(1, "ghost", 99, 999)])),
  );
  const env = { ...process.env, OUT_DIR: out, DATA_DIR: dataDir, PRESETS_DIR: presetsDir };
  execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build", "--silent"], { env, stdio: "pipe" });
  execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "src/scripts/build-badges.ts"], {
    env,
    stdio: "pipe",
  });
}, 120_000);

describe("site built from hostile data", () => {
  it("ships no source comments", () => {
    for (const page of files(out).filter((f) => f.endsWith(".html"))) {
      expect(readFileSync(page, "utf8"), page).not.toContain("<!--");
    }
  });

  it("renders every page without undefined, NaN or [object Object]", () => {
    const pages = files(out).filter((f) => f.endsWith(".html"));
    expect(pages.length).toBeGreaterThan(8);
    for (const page of pages) {
      // The whole page, scripts included: JSON-LD and inline data must not carry these either.
      expect(readFileSync(page, "utf8"), page).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
    }
  });

  it("creates country pages for titles with apostrophes and parentheses, and the empty states", () => {
    for (const path of ["cote_divoire", "cote_divoire/all", "congo_kinshasa/commits", "empty_land", "no_data"]) {
      expect(existsSync(join(out, path, "index.html")), path).toBe(true);
    }
    expect(readFileSync(join(out, "no_data", "index.html"), "utf8")).toMatch(/noindex/);
    expect(readFileSync(join(out, "cote_divoire", "index.html"), "utf8")).toContain("Côte d&#39;Ivoire");
  });

  it("marks each update date with a time element that carries the ISO timestamp", () => {
    const stamp = /<time datetime="2026-10-28T12:00:00\.000Z"/;
    expect(readFileSync(join(out, "cote_divoire", "index.html"), "utf8")).toMatch(stamp);
    expect(readFileSync(join(out, "index.html"), "utf8")).toMatch(stamp);
    expect(readFileSync(join(out, "cote_divoire", "index.html"), "utf8")).toMatch(
      /<span[^>]*>Updated <time datetime="2026-10-28T12:00:00\.000Z"[^>]*>[^<]+<\/time><\/span>/,
    );
  });

  it("shows no display names, even from older files that carry them", () => {
    for (const file of files(out).filter((f) => f.endsWith(".html") || f.endsWith(".json"))) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toContain("Octo</b>");
      expect(text, file).not.toContain("Octo&lt;/b&gt;");
    }
  });

  it("emits valid JSON-LD and API files", () => {
    for (const page of files(out).filter((f) => f.endsWith(".html"))) {
      for (const [, json] of readFileSync(page, "utf8").matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        expect(() => JSON.parse(json ?? ""), page).not.toThrow();
      }
    }
    const index = JSON.parse(readFileSync(join(out, "api", "index.json"), "utf8"));
    expect(index.countries.map((c: { slug: string }) => c.slug).sort()).toEqual([
      "big_land",
      "congo_kinshasa",
      "cote_divoire",
      "empty_land",
    ]);
    const world = JSON.parse(readFileSync(join(out, "api", "world.json"), "utf8"));
    const logins = world.rankings.public.map((r: { login: string }) => r.login.toLowerCase());
    expect(new Set(logins).size).toBe(logins.length);
  });

  it("writes one lowercase badge per person and ranking, with the best country", () => {
    const badge = JSON.parse(readFileSync(join(out, "u", "octo-cat.json"), "utf8"));
    expect(badge.message).toBe("#1 Congo (Kinshasa) (public contributions)");
    expect(readdirSync(join(out, "u"))).not.toContain("Octo-Cat.json");
    expect(existsSync(join(out, "u", "zed.commits.json"))).toBe(true);
  });

  it("puts the CSP first in <head>: a meta policy covers only what comes after it", () => {
    for (const page of documents()) {
      const html = readFileSync(page, "utf8");
      const csp = html.search(/<meta http-equiv="content-security-policy"/i);
      expect(csp, page).toBeGreaterThan(-1);
      expect(html.match(/content-security-policy/gi), page).toHaveLength(1);
      expect(csp, page).toBe(html.indexOf('<meta charset="utf-8">') + '<meta charset="utf-8">'.length);
      expect(csp, page).toBeLessThan(html.indexOf("<script"));
      expect(csp, page).toBeLessThan(html.indexOf("<title>"));
    }
  });

  it("writes world badges that match the world page, and none for countries without a page", () => {
    // octo-cat: 90 in Congo (Kinshasa) beats 50 in Côte d'Ivoire; zed has 40.
    const octo = JSON.parse(readFileSync(join(out, "u", "octo-cat.world.json"), "utf8"));
    expect(octo.message).toBe("#1 World (public contributions)");
    expect(JSON.parse(readFileSync(join(out, "u", "zed.world.json"), "utf8")).message).toBe(
      "#2 World (public contributions)",
    );
    const world = readFileSync(join(out, "world", "index.html"), "utf8");
    expect(world).toContain('See the <a href="/methodology/"');
    expect(world).toMatch(/id="octo-cat" data-rank="1"/);
    expect(world).toMatch(/id="zed" data-rank="2"/);
    expect(world).not.toContain("ghost");
    expect(world).not.toContain("farm-bot");
    expect(JSON.parse(readFileSync(join(out, "u", "farm-bot.world.json"), "utf8")).message).toBe(
      "World: unranked (public contributions)",
    );
    expect(existsSync(join(out, "u", "farm-bot.json"))).toBe(true);
    const country = readFileSync(join(out, "cote_divoire", "index.html"), "utf8");
    const farmRow = country.slice(country.indexOf('id="farm-bot"'), country.indexOf('id="octo-cat"'));
    // Every mark names its rule and the numbers behind it.
    expect(farmRow).toContain(
      "Likely automated: 900,000 commits per pull request, issue or review (limit 50). Not in the world ranking.",
    );
    const quietRow = country.slice(country.indexOf('id="quiet-farm"'));
    expect(quietRow).toContain(
      "Likely automated: 75% of commits in one repository of their own with under 10 stars (limit 60%). Not in the world ranking.",
    );
    expect(country.slice(country.indexOf('id="octo-cat"'), country.indexOf('id="quiet-farm"'))).not.toContain(
      "Likely automated",
    );
    expect(quietRow).not.toContain("cannot be checked");
    const all = readFileSync(join(out, "cote_divoire", "all", "index.html"), "utf8");
    expect(all.slice(all.indexOf('id="quiet-farm"'))).toContain("90% private, cannot be checked (marked from 90%).");
    // The browser gets the numbers to put the message into the page's language.
    const ru = readFileSync(join(out, "ru", "cote_divoire", "index.html"), "utf8");
    const big = new Intl.NumberFormat("ru").format(900000);
    expect(ru).toContain(`коммитов на каждый PR, issue или ревью — ${big} (порог 50)`);
    expect(ru).toMatch(/data-k="row.automated.quiet" data-v="[^"]*&quot;share&quot;:75/);
    expect(existsSync(join(out, "u", "ghost.json"))).toBe(false);
    expect(existsSync(join(out, "u", "ghost.world.json"))).toBe(false);
  });

  it("links one stylesheet from every page, so a page switch never waits for another", () => {
    const sheets = new Set<string>();
    for (const page of documents()) {
      const links = [...readFileSync(page, "utf8").matchAll(/<link rel="stylesheet" href="([^"]+)"/g)];
      expect(links, page).toHaveLength(1);
      sheets.add(links[0]?.[1] ?? "");
    }
    expect(sheets.size).toBe(1);
  });

  it("starts the badge-link lookup inline on /find/, before the stylesheet, with the data from the build", () => {
    const html = readFileSync(join(out, "find", "index.html"), "utf8");
    const script = html.indexOf(`<script>${embedded("find")}</script>`);
    expect(script).toBeGreaterThan(0);
    expect(script).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
    const meta = html.match(/<meta name="find-data" content="([^"]*)"/)?.[1] ?? "";
    expect(html.indexOf('<meta name="find-data"')).toBeLessThan(script);
    const data = JSON.parse(meta.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&"));
    expect(data.sizes).toEqual([10, 50, 100, 256, 512]);
    expect(data.slugs).toEqual({
      "Big Land": "big_land",
      "Congo (Kinshasa)": "congo_kinshasa",
      "Côte d'Ivoire": "cote_divoire",
      "Empty Land": "empty_land",
      "No Data": "no_data",
    });
    expect(html).not.toMatch(/find\.astro_astro_type_script/);
  });

  it("checks badge links and #login links with the same patterns as the collector", () => {
    const find = readFileSync("src/web/scripts/find.js", "utf8");
    expect(find).toContain(`const LOGIN = ${LOGIN};`);
    expect(find).toContain(`const SLUG = ${SLUG};`);
    expect(readFileSync("src/web/scripts/ranking.js", "utf8")).toContain(`const LOGIN = ${LOGIN};`);
  });

  it("puts only the smallest size in the page and the rest in fragments, one per step", () => {
    const html = readFileSync(join(out, "big_land", "index.html"), "utf8");
    expect(html.match(/<tr id=/g)).toHaveLength(10);
    expect(html).toContain('data-more="/rows/big_land/public/"');
    expect(html).toContain('data-starts="10,50"');
    const step = (n: number) => readFileSync(join(out, "rows", "big_land", "public", String(n), "index.html"), "utf8");
    const ranks = (fragment: string) => [...fragment.matchAll(/data-rank="([0-9]+)"/g)].map((m) => Number(m[1]));
    expect(ranks(step(11))).toEqual(Array.from({ length: 40 }, (_, i) => 11 + i));
    expect(ranks(step(51))).toEqual(Array.from({ length: 10 }, (_, i) => 51 + i));
    for (const fragment of [step(11), step(51)]) {
      expect(fragment.trimStart().startsWith("<tr")).toBe(true);
      expect(fragment).not.toMatch(/<html|<head|<script/);
      expect(fragment).toContain('loading="lazy"');
    }
    // The page's own rows are always at the top: their avatars do not wait for layout.
    expect(html).toContain('loading="eager"');
    expect(html).not.toContain('loading="lazy"');
    expect(existsSync(join(out, "rows", "big_land", "public", "101"))).toBe(false);
    // A ranking that fits its smallest size has no fragments and fetches nothing.
    expect(existsSync(join(out, "rows", "cote_divoire"))).toBe(false);
    expect(readFileSync(join(out, "cote_divoire", "index.html"), "utf8")).not.toMatch(
      /data-more="|<meta name="ranking"/,
    );
    expect(readFileSync(join(out, "robots.txt"), "utf8")).toContain("Disallow: /rows/");
  });

  it("starts fetching the steps a size needs from <head>, before the stylesheet", () => {
    const html = readFileSync(join(out, "big_land", "index.html"), "utf8");
    const meta = html.indexOf('<meta name="ranking"');
    const script = html.indexOf(`<script data-astro-rerun>${embedded("ranking-early")}</script>`);
    expect(meta).toBeGreaterThan(0);
    expect(script).toBeGreaterThan(meta);
    expect(script).toBeLessThan(html.indexOf('<link rel="stylesheet"'));
  });

  it("runs the ranking script inline, right after the table, before the first paint and after every page switch", () => {
    const html = readFileSync(join(out, "cote_divoire", "index.html"), "utf8");
    const script = `</table><script data-astro-rerun>${embedded("ranking")}</script>`;
    expect(html).toContain(script);
    expect(html).not.toMatch(/RankingTable\.astro_astro_type_script/);
  });

  it("preloads every module a page imports, so none waits for another", () => {
    for (const page of files(out).filter((f) => f.endsWith(".html"))) {
      const html = readFileSync(page, "utf8");
      const listed = new Set(
        [...html.matchAll(/<(?:script type="module" src|link rel="modulepreload" href)="([^"]+)"/g)].map((m) => m[1]),
      );
      for (const src of listed) {
        const code = readFileSync(join(out, src ?? ""), "utf8");
        for (const [, dep] of code.matchAll(/(?:import|from) *["']([.][/][^"']+[.]js)["']/g)) {
          expect(listed, `${page}: ${dep}`).toContain(`/_astro/${dep?.slice(2)}`);
        }
      }
    }
  });

  it("keeps the CSP: every inline script is hashed", () => {
    for (const page of files(out).filter((f) => f.endsWith(".html"))) {
      const html = readFileSync(page, "utf8");
      const csp = html.match(/content-security-policy" content="([^"]*)"/i)?.[1] ?? "";
      for (const [, body] of html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) {
        const hash = `sha256-${createHash("sha256")
          .update(body ?? "")
          .digest("base64")}`;
        expect(csp, page).toContain(hash);
      }
    }
  });

  it("describes the pages for search: a descriptive home title, the world ranking as a dataset", () => {
    expect(readFileSync(join(out, "index.html"), "utf8")).toContain(
      "<title>Most active GitHub users by country | contributor.top</title>",
    );
    const world = readFileSync(join(out, "world", "index.html"), "utf8");
    const ld = JSON.parse(world.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1] ?? "{}");
    const [dataset, list] = ld["@graph"] ?? [];
    expect(dataset["@type"]).toBe("Dataset");
    expect(dataset.url).toBe("https://contributor.top/world/");
    expect(dataset.dateModified).toMatch(/^20[0-9]{2}-/);
    expect(list["@type"]).toBe("ItemList");
    expect(list.itemListElement[0].position).toBe(1);
  });

  it("builds every page in every language and the row fragments once", () => {
    const html = readFileSync(join(out, "ru", "cote_divoire", "index.html"), "utf8");
    expect(html).toContain('<html lang="ru"');
    expect(html).toContain(new Intl.DisplayNames(["ru"], { type: "region" }).of("CI"));
    for (const path of ["ru/world", "ru/badge", "ru/methodology", "ru/privacy", "ru/big_land/all"]) {
      expect(existsSync(join(out, path, "index.html")), path).toBe(true);
    }
    expect(existsSync(join(out, "ru", "rows"))).toBe(false);
    expect(readFileSync(join(out, "sitemap.xml"), "utf8")).toContain("<loc>https://contributor.top/ru/world/</loc>");
  });

  it("links each page to itself in every language, and puts each in its own canonical URL", () => {
    const html = readFileSync(join(out, "ru", "cote_divoire", "index.html"), "utf8");
    expect(html).toContain('<link rel="canonical" href="https://contributor.top/ru/cote_divoire/">');
    expect(html).toContain('<link rel="alternate" hreflang="en" href="https://contributor.top/cote_divoire/">');
    expect(html).toContain('<link rel="alternate" hreflang="x-default" href="https://contributor.top/cote_divoire/">');
    // Pages kept out of search results name no other versions.
    expect(readFileSync(join(out, "ru", "find", "index.html"), "utf8")).not.toContain('rel="alternate"');
  });

  it("translates the first rows on the page and hands the browser what it needs for the rest", () => {
    const html = readFileSync(join(out, "ru", "big_land", "index.html"), "utf8");
    expect(html).toMatch(/aria-label="1 публичный коммит"/);
    const words = JSON.parse((html.match(/data-i18n="([^"]*)"/)?.[1] ?? "{}").replaceAll("&quot;", '"'));
    expect(words.locale).toBe("ru");
    expect(Object.keys(words.messages)).toContain("row.commits");
    // Fragments are the same for every language: English, with the raw numbers for ranking.js.
    const fragment = readFileSync(join(out, "rows", "big_land", "public", "11", "index.html"), "utf8");
    expect(fragment).toMatch(/data-k="row.commits" data-n="1"/);
    expect(readFileSync(join(out, "big_land", "index.html"), "utf8")).not.toContain("data-i18n=");
  });
});
