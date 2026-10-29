import { describe, expect, it } from "vitest";
import { configSchema, loadConfig } from "../collector/config.ts";
import { loadPresets, presetChecksum, presetSchema, validateSlug } from "../collector/preset.ts";
import { ConfigError, loadYaml } from "../collector/yaml.ts";

const preset = (body: string) => () => loadYaml("test.yml", presetSchema, body);

describe("loadYaml", () => {
  it("keeps NO as a string (no Norway problem) but the schema demands quotes-level type", () => {
    const p = loadYaml("t.yml", presetSchema, 'title: Norway\niso: "NO"\ninclude: [norway]\nexclude: []\n');
    expect(p.iso).toBe("NO");
  });

  it("reports the line of a schema error", () => {
    expect(preset("title: Norway\niso: no\ninclude: [norway]\nexclude: []\n")).toThrow(/line 2: iso/);
  });

  it("rejects duplicate keys, anchors, aliases and custom tags", () => {
    expect(preset("title: A\ntitle: B\niso: null\ninclude: [aa]\nexclude: []\n")).toThrow(ConfigError);
    expect(preset("title: &t Abc\niso: null\ninclude: [*t]\nexclude: []\n")).toThrow(/anchors|aliases/);
    expect(preset("title: !custom Abc\niso: null\ninclude: [aa]\nexclude: []\n")).toThrow(/custom tags/);
  });

  it("rejects unknown fields", () => {
    expect(preset("title: Abc\niso: null\ninclude: [aa]\nexclude: []\nextra: 1\n")).toThrow(ConfigError);
  });

  it("reports root-level problems at the first line", () => {
    expect(preset("[1, 2]\n")).toThrow(/line 1: Invalid input/);
  });

  it("reports syntax errors with a line", () => {
    expect(preset("title: [unclosed\n")).toThrow(/line \d+:/);
  });
});

describe("presetSchema", () => {
  const base = { title: "Testland", iso: "TL", include: ["testland"], exclude: [] };

  it("rejects duplicates, include/exclude overlap and unknown post_filter keys", () => {
    expect(presetSchema.safeParse({ ...base, include: ["a b", "A B"] }).success).toBe(false);
    expect(presetSchema.safeParse({ ...base, exclude: ["Testland"] }).success).toBe(false);
    expect(presetSchema.safeParse({ ...base, post_filter: { other: ["usa"] } }).success).toBe(false);
    expect(presetSchema.safeParse({ ...base, post_filter: { testland: ["usa"] } }).success).toBe(true);
  });

  it("rejects URLs, mentions and non-normalized or padded terms", () => {
    for (const bad of ["https://x.y", "@someone", " minsk", "éesti"]) {
      expect(presetSchema.safeParse({ ...base, include: [bad] }).success).toBe(false);
    }
    expect(presetSchema.safeParse({ ...base, include: ["kohtla-järve", "brest, belarus", "n'djamena"] }).success).toBe(
      true,
    );
  });

  it("checksum ignores order and case but not content", () => {
    const a = presetChecksum({ ...base, include: ["Minsk", "grodno"], exclude: [] });
    const b = presetChecksum({ ...base, include: ["grodno", "minsk"], exclude: [] });
    const c = presetChecksum({ ...base, include: ["grodno"], exclude: [] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(presetChecksum({ ...base, post_filter: { testland: ["USA", "ga"] } })).toBe(
      presetChecksum({ ...base, post_filter: { testland: ["ga", "usa"] } }),
    );
  });
});

describe("slugs", () => {
  it("accepts simple slugs and rejects reserved or malformed ones", () => {
    expect(validateSlug("south_korea", ["world"])).toBeNull();
    expect(validateSlug("world", ["world"])).toMatch(/reserved/);
    expect(validateSlug("South-Korea", [])).toMatch(/must match/);
  });
});

describe("repository files", () => {
  it("config.yml and presets/ are valid", () => {
    const config = loadConfig();
    expect(configSchema.safeParse(config).success).toBe(true);
    expect(loadPresets("presets", config.reserved_slugs).size).toBeGreaterThan(0);
  });

  it("config refinements catch inconsistent ranking settings", () => {
    const config = loadConfig();
    const bad = { ...config, ranking: { ...config.ranking, default_top: 7 } };
    expect(configSchema.safeParse(bad).success).toBe(false);
    const phrases = { ...config, privacy: { ...config.privacy, optin_phrase: config.privacy.optout_phrase } };
    expect(configSchema.safeParse(phrases).success).toBe(false);
  });

  it("loadPresets collects every bad file into one error", () => {
    expect(() => loadPresets("test/fixtures/bad-presets", [])).toThrow(/Bad-Slug\.yml[\s\S]*broken\.yml/);
  });
});
