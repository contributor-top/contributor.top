// Tests written to break the code: hostile inputs, flaky APIs, boundary values and malformed data.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { configSchema, loadConfig } from "../src/collector/config.ts";
import { countryDataSchema } from "../src/collector/country-data.ts";
import { loadCountries } from "../src/collector/data-dir.ts";
import { compactNumber, isMostlyPrivate, privateShare } from "../src/collector/flags.ts";
import { decide, statusMatches } from "../src/collector/optout.ts";
import { loadPresets, presetSchema } from "../src/collector/preset.ts";
import { type Candidate, minFollowers, rank, TABS } from "../src/collector/rank.ts";
import { scrub } from "../src/collector/scrub.ts";
import { countsFor, matchingPresets } from "../src/collector/stuffing.ts";
import { type CountFn, findThreshold, splitRanges } from "../src/collector/threshold.ts";
import { loadYaml } from "../src/collector/yaml.ts";

const tmp = () => mkdtempSync(join(tmpdir(), "ct-adv-"));

describe("search against a misbehaving API", () => {
  // GitHub's userCount is approximate; a broken or capped count must not hang the collector.
  it("findThreshold gives up instead of looping forever when counts never drop", async () => {
    const stuck: CountFn = async () => 5000;
    await expect(findThreshold(stuck, 1000)).rejects.toThrow(/follower/i);
  }, 2000);

  it("splitRanges gives up instead of looping forever when counts never drop", async () => {
    const stuck: CountFn = async () => 5000;
    await expect(splitRanges(stuck, 10)).rejects.toThrow(/follower/i);
  }, 2000);

  it("findThreshold works when the API errors propagate", async () => {
    const failing: CountFn = async () => {
      throw new Error("502 Bad Gateway");
    };
    await expect(findThreshold(failing, 10)).rejects.toThrow("502");
  });

  it("findThreshold handles consider = 0 and empty locations", async () => {
    expect(await findThreshold(async () => 0, 0)).toBe(0);
    const t = await findThreshold(async ({ min }) => (min <= 3 ? 1 : 0), 0);
    expect(t).toBe(4);
  });

  it("splitRanges with min = 0 and a crowded zero bucket terminates", async () => {
    const count: CountFn = async ({ min, max }) => (min === 0 && (max === null || max >= 0) ? 3000 : 0);
    const ranges = await splitRanges(count, 0);
    expect(ranges[0]).toEqual({ min: 0, max: 0 });
  });
});

describe("ranking with inconsistent API numbers", () => {
  const base: Candidate = {
    id: 1,
    login: "a",
    followers: 1,
    total: 10,
    restricted: 0,
    commits: 0,
    prs: 0,
    issues: 0,
    reviews: 0,
  };

  it("never produces negative public contributions (restricted > total)", () => {
    const rows = rank([{ ...base, total: 5, restricted: 9 }], TABS.public, 10);
    expect(rows[0]?.contributions).toBeGreaterThanOrEqual(0);
  });

  it("published rows always pass the strict data schema", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            id: fc.integer({ min: 1, max: 1e6 }),
            login: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
            followers: fc.nat(1000),
            total: fc.nat(5000),
            restricted: fc.nat(9000),
            commits: fc.nat(5000),
            prs: fc.nat(500),
            issues: fc.nat(500),
            reviews: fc.nat(500),
          }),
          { selector: (c) => c.login, maxLength: 50 },
        ),
        (cs) => {
          const tabs = {
            public: rank(cs, TABS.public, 512),
            all: rank(cs, TABS.all, 512),
            commits: rank(cs, TABS.commits, 512),
          };
          const data = {
            slug: "x_land",
            title: "X Land",
            updatedAt: "2026-10-28T12:00:00.000Z",
            totalUsers: cs.length,
            considered: cs.length,
            minFollowers: minFollowers(cs),
            tabs,
            breakdown: {},
          };
          const parsed = countryDataSchema.safeParse(data);
          expect(parsed.success, JSON.stringify(parsed.error?.issues[0])).toBe(true);
        },
      ),
    );
  });

  it("minFollowers survives very large candidate lists", () => {
    const many = Array.from({ length: 300_000 }, (_, i) => ({ ...base, id: i + 1, followers: 300_000 - i }));
    expect(minFollowers(many)).toBe(1);
  });
});

describe("compact numbers at unit boundaries", () => {
  it("never prints 1000k", () => {
    expect(compactNumber(999_499)).toBe("999k");
    expect(compactNumber(999_500)).toBe("1M");
    expect(compactNumber(999_999)).toBe("1M");
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(9_999)).toBe("10k");
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2e9 }), (n) => {
        expect(compactNumber(n)).not.toMatch(/^1000[kM]$/);
      }),
    );
  });

  it("private share edge cases", () => {
    expect(privateShare(0, 0)).toBe(0);
    expect(isMostlyPrivate(0, 0, 0.9)).toBe(false);
    expect(isMostlyPrivate(1, 9, 0.9)).toBe(true);
  });
});

describe("malformed data files", () => {
  it("names the file when JSON itself is broken", () => {
    const dir = tmp();
    mkdirSync(join(dir, "countries"));
    writeFileSync(join(dir, "countries", "broken.json"), "{ not json");
    expect(() => loadCountries(dir)).toThrow(/broken\.json/);
  });

  const valid = {
    slug: "x_land",
    title: "X Land",
    updatedAt: "2026-10-28T12:00:00.000Z",
    totalUsers: 2,
    considered: 2,
    minFollowers: 0,
    tabs: {
      public: [
        { rank: 1, login: "a", id: 1, contributions: 5 },
        { rank: 2, login: "b", id: 2, contributions: 3 },
      ],
      all: [],
      commits: [],
    },
    breakdown: {},
  };

  it("rejects duplicate logins in one ranking (duplicate #anchors, colliding badges)", () => {
    const dup = {
      ...valid,
      tabs: { ...valid.tabs, public: [valid.tabs.public[0], { ...valid.tabs.public[1], login: "A" }] },
    };
    expect(countryDataSchema.safeParse(dup).success).toBe(false);
  });

  it("rejects ranks that are not 1, 2, 3, … in order", () => {
    const gap = {
      ...valid,
      tabs: { ...valid.tabs, public: [valid.tabs.public[0], { ...valid.tabs.public[1], rank: 5 }] },
    };
    expect(countryDataSchema.safeParse(gap).success).toBe(false);
  });

  it("rejects rows that are not sorted by contributions", () => {
    const unsorted = {
      ...valid,
      tabs: { ...valid.tabs, public: [{ ...valid.tabs.public[0], contributions: 1 }, valid.tabs.public[1]] },
    };
    expect(countryDataSchema.safeParse(unsorted).success).toBe(false);
  });
});

describe("presets and config from real-world editors", () => {
  it("accepts a UTF-8 BOM and CRLF line endings (Windows editors)", () => {
    const text = '﻿title: Testland\r\niso: "TL"\r\ninclude:\r\n  - testland\r\nexclude: []\r\n';
    expect(loadYaml("t.yml", presetSchema, text).iso).toBe("TL");
  });

  it("does not silently ignore a preset saved as .yaml", () => {
    const dir = tmp();
    writeFileSync(join(dir, "canada.yaml"), 'title: Canada\niso: "CA"\ninclude: [canada]\nexclude: []\n');
    expect(() => loadPresets(dir, [])).toThrow(/canada\.yaml/);
  });

  it("rejects duplicate or unsorted top sizes", () => {
    const config = loadConfig();
    const dup = { ...config, ranking: { ...config.ranking, top_choices: [10, 10, 100], default_top: 10 } };
    expect(configSchema.safeParse(dup).success).toBe(false);
  });

  it("rejects an empty YAML file with a clear error", () => {
    expect(() => loadYaml("empty.yml", presetSchema, "")).toThrow(/empty\.yml[\s\S]*empty/);
    expect(() => loadYaml("blank.yml", presetSchema, "# only a comment\n")).toThrow(/blank\.yml/);
  });

  it("reports an empty value with its line instead of crashing", () => {
    expect(() => loadYaml("t.yml", presetSchema, "title: Testland\niso:\ninclude: [testland]\nexclude:\n")).toThrow(
      /t\.yml[\s\S]*line \d+/,
    );
  });

  it("rejects a merge key that would pull in other values", () => {
    expect(() =>
      loadYaml("m.yml", presetSchema, "title: A\niso: null\ninclude: [aa]\nexclude: []\n<<: {x: 1}\n"),
    ).toThrow();
  });
});

describe("country assignment", () => {
  const p = (title: string, include: string[]) => ({ title, iso: null, include, exclude: [] });
  const presets = new Map([
    ["guinea", p("Guinea", ["guinea", "conakry"])],
    ["papua_new_guinea", p("Papua New Guinea", ["papua new guinea", "port moresby"])],
    ["chad", p("Chad", ["n'djamena", "chad"])],
    ["belarus", p("Belarus", ["belarus", "minsk"])],
  ]);

  it("a longer country name is not stolen by a shorter one inside it", () => {
    expect(countsFor("papua_new_guinea", "Port Moresby, Papua New Guinea", presets)).toBe(true);
    expect(countsFor("guinea", "Port Moresby, Papua New Guinea", presets)).toBe(false);
    expect(countsFor("papua_new_guinea", "Papua New Guinea", presets)).toBe(true);
    expect(countsFor("guinea", "Papua New Guinea", presets)).toBe(false);
  });

  it("matches typographic apostrophes and case", () => {
    expect(matchingPresets("N’DJAMENA", presets)).toEqual(["chad"]);
  });

  it("handles emoji, RTL and very long locations without throwing", () => {
    const long = `${"🇧🇾 ".repeat(5000)} Minsk`;
    expect(countsFor("belarus", long, presets)).toBe(true);
    expect(matchingPresets("مينسك، بيلاروسيا", presets)).toEqual([]);
  });
});

describe("opt-out phrases", () => {
  const out = "contributors.top opt-out";
  const inn = "contributors.top opt-in";

  it("matches lookalike full-width text and line breaks", () => {
    expect(statusMatches("ｃｏｎｔｒｉｂｕｔｏｒｓ．ｔｏｐ ｏｐｔ－ｏｕｔ", out)).toBe(true);
    expect(statusMatches("contributors.top\nopt-out", out)).toBe(true);
  });

  it("does not opt out on a different word", () => {
    expect(decide("contributors.top opt-outlet", out, inn)).toBe("opt-out"); // contains: deliberate, documented
    expect(decide("contributors.top optout", out, inn)).toBe("none");
  });
});

describe("log scrubbing", () => {
  it("redacts logins that differ only in case and inside punctuation", () => {
    expect(scrub("(Octo-Cat), octo-cat; OCTO-CAT.", ["octo-cat"])).toBe("([redacted]), [redacted]; [redacted].");
  });

  it("does not hang on many logins and long text", () => {
    const logins = Array.from({ length: 2000 }, (_, i) => `user-${i}`);
    const text = Array.from({ length: 3 }, () => logins.join(" ")).join(" ");
    const out = scrub(text, logins);
    expect(out).not.toMatch(/user-\d/);
  }, 5000);
});
