// Second round of tests written to break the code.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { configSchema, loadConfig } from "../collector/config.ts";
import { decide } from "../collector/optout.ts";
import { displayTitle, loadPresets, presetSchema } from "../collector/preset.ts";
import { type Candidate, rank, TABS } from "../collector/rank.ts";
import { jsonForScript } from "../collector/safe-json.ts";
import { type CountFn, findThreshold, splitRanges } from "../collector/threshold.ts";

describe("garbage from the search API", () => {
  for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
    it(`findThreshold rejects a count of ${bad} instead of guessing`, async () => {
      const count: CountFn = async () => bad;
      await expect(findThreshold(count, 10)).rejects.toThrow(/count/i);
    });
    it(`splitRanges rejects a count of ${bad}`, async () => {
      const count: CountFn = async () => bad;
      await expect(splitRanges(count, 0)).rejects.toThrow(/count/i);
    });
  }
});

describe("ranking limits", () => {
  const c = (id: number): Candidate => ({
    id,
    login: `u${id}`,
    followers: 1,
    total: id,
    restricted: 0,
    commits: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
  });

  it("counts a person returned twice by the search only once", () => {
    const twice = [c(1), { ...c(1), login: "u1-renamed" }, c(2)];
    const rows = rank(twice, TABS.all, 10);
    expect(rows.map((r) => r.id).sort()).toEqual([1, 2]);
    expect(rows.find((r) => r.id === 1)?.login).toBe("u1");
  });

  it("a non-positive top size never returns a partial list", () => {
    const cs = [c(1), c(2), c(3)];
    expect(rank(cs, TABS.all, 0)).toEqual([]);
    expect(rank(cs, TABS.all, -1)).toEqual([]);
  });
});

describe("names that render as nothing", () => {
  it("rejects titles and location terms without a single letter or digit", () => {
    for (const blank of ["  ", "--", "..", "' '", ", ,"]) {
      expect(displayTitle.safeParse(blank).success, `title ${JSON.stringify(blank)}`).toBe(false);
      const preset = { title: "Testland", iso: null, include: [blank], exclude: [] };
      expect(presetSchema.safeParse(preset).success, `term ${JSON.stringify(blank)}`).toBe(false);
    }
  });
});

describe("two presets with the same title", () => {
  it("are rejected: badges and /find/ map titles back to countries", () => {
    const dir = mkdtempSync(join(tmpdir(), "ct-adv2-"));
    writeFileSync(join(dir, "congo.yml"), 'title: Congo\niso: "CG"\ninclude: [brazzaville]\nexclude: []\n');
    writeFileSync(join(dir, "congo_drc.yml"), 'title: Congo\niso: "CD"\ninclude: [kinshasa]\nexclude: []\n');
    expect(() => loadPresets(dir, [])).toThrow(/Congo/);
  });
});

describe("opt-out phrases that shadow each other", () => {
  it("config rejects an opt-in phrase that contains the opt-out phrase (opt-in would be impossible)", () => {
    const config = loadConfig();
    const shadow = { ...config, privacy: { ...config.privacy, optout_phrase: "ct opt", optin_phrase: "ct opt-in" } };
    expect(configSchema.safeParse(shadow).success).toBe(false);
  });

  it("with the real config an opt-in status is read as opt-in", () => {
    const { optout_phrase, optin_phrase } = loadConfig().privacy;
    expect(decide(optin_phrase, optout_phrase, optin_phrase)).toBe("opt-in");
    expect(decide(optout_phrase, optout_phrase, optin_phrase)).toBe("opt-out");
  });
});

describe("jsonForScript", () => {
  it("handles values JSON.stringify turns into undefined", () => {
    expect(jsonForScript(undefined)).toBe("null");
    expect(jsonForScript(() => 1)).toBe("null");
  });
});
