// Translations: every language has what English has, in a shape the pages can use.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = "src/web/i18n";
type Message = string | Record<string, string>;
const load = (lang: string): Record<string, Message> => JSON.parse(readFileSync(join(dir, `${lang}.json`), "utf8"));
const en = load("en");
const others = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "en.json")
  .map((f) => f.slice(0, -5));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const forms = (m: Message) => (typeof m === "string" ? [m] : Object.values(m));
const enPlaceholders = (key: string) => placeholders(forms(en[key] as Message).at(-1) ?? "");

describe("translations", () => {
  it("has at least one language besides English", () => {
    expect(others.length).toBeGreaterThan(0);
  });

  describe.each(others)("%s", (lang) => {
    const dict = load(lang);
    const code = String(dict["lang.code"]);

    it("has every English key and no other", () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(en).sort());
    });

    it("names itself with a valid language code", () => {
      expect(Intl.getCanonicalLocales(code)).toEqual([code]);
      expect(String(dict["lang.name"]).length).toBeGreaterThan(1);
    });

    it("keeps every placeholder, and has the plural forms its language needs", () => {
      const needed = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
      for (const [key, message] of Object.entries(dict)) {
        if (typeof en[key] === "object" && typeof message === "object") {
          expect(Object.keys(message).sort(), `${lang} ${key}`).toEqual([...needed].sort());
        }
        for (const text of forms(message)) {
          expect(text.trim().length, `${lang} ${key}`).toBeGreaterThan(0);
          // A plural form may spell out its number ("один коммит"), so {n} is optional only there.
          const want = enPlaceholders(key).filter((p) => !(typeof message === "object" && p === "n"));
          expect(
            placeholders(text).filter((p) => !(typeof message === "object" && p === "n")),
            `${lang} ${key}`,
          ).toEqual(want);
        }
      }
    });

    it("keeps the highlighted part of the notice", () => {
      expect(String(dict["site.notice"])).toMatch(/\[[^\]]+\]/);
    });

    it("translates Methodology and Privacy, linking to its own pages", () => {
      for (const doc of ["methodology", "privacy"]) {
        const path = join(dir, "docs", lang, `${doc}.md`);
        expect(existsSync(path), path).toBe(true);
        const text = readFileSync(path, "utf8");
        expect(text, path).toMatch(/^---\ntitle: .+\ndescription: .+\n---\n/);
        // Links to the site's pages stay in this language; the JSON files have one address for everyone.
        for (const [, href] of text.matchAll(/\]\((\/[^)]*)\)/g)) {
          if (!href?.startsWith("/api/")) expect(href, path).toMatch(new RegExp(`^/${lang}/`));
        }
      }
      // The status phrases are read literally from GitHub profiles: never translated.
      const privacy = readFileSync(join(dir, "docs", lang, "privacy.md"), "utf8");
      expect(privacy).toContain("`contributor.top opt-out`");
      expect(privacy).toContain("`contributor.top opt-in`");
    });

    // Translations come from outside contributors: Markdown only (raw HTML would reach the page untouched, e.g. a
    // <meta> redirect the CSP cannot stop), and links out of the site only to the project and committers.top.
    it("has no raw HTML in Methodology and Privacy, and links only to known sites", () => {
      for (const doc of ["methodology", "privacy"]) {
        const path = join(dir, "docs", lang, `${doc}.md`);
        const prose = readFileSync(path, "utf8").replace(/`[^`]*`/g, "");
        expect(prose, path).not.toMatch(/<[a-z!/?]/i);
        const known = /^(https:\/\/github\.com\/contributor-top\/|https:\/\/committers\.top\b)/;
        const links = [...prose.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1] ?? "");
        // Bare addresses become links too (GFM).
        const bare = [...prose.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s)\]>]+/gi)].map((m) => m[0]);
        for (const href of [...links, ...bare].filter((h) => !/^[/#]/.test(h))) expect(href, path).toMatch(known);
      }
    });

    it("never takes the address of a country", () => {
      const slugs = readdirSync("../presets").map((f) => f.replace(/\.yml$/, ""));
      expect(slugs).not.toContain(lang);
    });
  });
});
