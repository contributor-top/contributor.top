// Integration: builds the whole site from hostile data and inspects the output.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const root = mkdtempSync(join(tmpdir(), "ct-site-"));
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

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

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
  const ci = country("cote_divoire", "Côte d'Ivoire", [row(1, "Octo-Cat", 11, 50), row(2, "zed", 12, 40)]);
  const cd = country("congo_kinshasa", "Congo (Kinshasa)", [row(1, "octo-cat", 11, 90)]);
  writeFileSync(join(dataDir, "countries", "cote_divoire.json"), JSON.stringify(ci));
  writeFileSync(join(dataDir, "countries", "congo_kinshasa.json"), JSON.stringify(cd));
  writeFileSync(join(dataDir, "countries", "empty_land.json"), JSON.stringify(country("empty_land", "Empty Land", [])));
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
    for (const page of files(out).filter((f) => f.endsWith(".html"))) {
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
    expect(octo.message).toBe("#1 in the world (public contributions)");
    expect(JSON.parse(readFileSync(join(out, "u", "zed.world.json"), "utf8")).message).toBe(
      "#2 in the world (public contributions)",
    );
    const world = readFileSync(join(out, "world", "index.html"), "utf8");
    expect(world).toMatch(/id="octo-cat" data-rank="1"/);
    expect(world).toMatch(/id="zed" data-rank="2"/);
    expect(world).not.toContain("ghost");
    expect(existsSync(join(out, "u", "ghost.json"))).toBe(false);
    expect(existsSync(join(out, "u", "ghost.world.json"))).toBe(false);
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
});
