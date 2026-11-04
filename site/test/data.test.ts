import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { badgeColor, buildBadges } from "../src/collector/badges.ts";
import { type CountryData, countryDataSchema } from "../src/collector/country-data.ts";
import { dataDir, loadCountries, presetsDir } from "../src/collector/data-dir.ts";
import { isLikelyAutomated } from "../src/collector/flags.ts";
import { worldRanking } from "../src/collector/world.ts";

const row = (rank: number, login: string, id: number) => ({ rank, login, id, contributions: 100 - rank });
const country = (slug: string, title: string, rows: ReturnType<typeof row>[]): CountryData => ({
  slug,
  title,
  updatedAt: "2026-10-28T12:00:00.000Z",
  totalUsers: 10,
  considered: rows.length,
  minFollowers: 1,
  tabs: { public: rows, all: rows, commits: rows },
  breakdown: {},
});

describe("country data schema", () => {
  it("accepts fixtures and rejects extra personal fields", () => {
    expect(loadCountries("test/fixtures/data").length).toBeGreaterThan(0);
    const leaking = {
      ...country("x", "X", [row(1, "a", 1)]),
      tabs: { public: [{ ...row(1, "a", 1), name: "A" }], all: [], commits: [] },
    };
    expect(countryDataSchema.safeParse(leaking).success).toBe(false);
    expect(countryDataSchema.safeParse({ ...country("x", "X", []), email: "a@b.c" }).success).toBe(false);
  });

  it("reports the broken file", () => {
    const dir = mkdtempSync(join(tmpdir(), "ct-"));
    mkdirSync(join(dir, "countries"));
    writeFileSync(join(dir, "countries", "bad.json"), JSON.stringify({ slug: 1 }));
    expect(() => loadCountries(dir)).toThrow(/bad\.json/);
  });

  it("an empty or missing data dir means no countries yet", () => {
    expect(loadCountries(join(tmpdir(), "does-not-exist-ct"))).toEqual([]);
  });
});

describe("dataDir and presetsDir", () => {
  const original = { data: process.env["DATA_DIR"], presets: process.env["PRESETS_DIR"] };
  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };
  afterEach(() => {
    restore("DATA_DIR", original.data);
    restore("PRESETS_DIR", original.presets);
  });

  it("uses fixtures (fictional countries) unless real data is given", () => {
    delete process.env["DATA_DIR"];
    delete process.env["PRESETS_DIR"];
    expect(dataDir()).toBe("test/fixtures/data");
    expect(presetsDir()).toBe("test/fixtures/presets");
    process.env["DATA_DIR"] = "/tmp/data";
    expect(dataDir()).toBe("/tmp/data");
    expect(presetsDir()).toBe("../presets");
    process.env["PRESETS_DIR"] = "/tmp/presets";
    expect(presetsDir()).toBe("/tmp/presets");
  });
});

describe("badges", () => {
  it("uses medal colors for the top 3", () => {
    expect([1, 2, 3, 4].map(badgeColor)).toEqual(["d4a72c", "a0a8b0", "b87333", "007ec6"]);
  });

  it("keys by lowercase login and keeps the best rank across countries", () => {
    const badges = buildBadges(
      [country("a", "Alpha", [row(5, "Octo", 1), row(1, "solo", 2)]), country("b", "Beta", [row(2, "octo", 1)])],
      512,
    );
    expect(badges.get("octo")?.message).toBe("#2 Beta (public contributions)");
    expect(badges.get("solo")).toMatchObject({
      schemaVersion: 1,
      message: "#1 Alpha (public contributions)",
      color: "d4a72c",
      namedLogo: "github",
    });
    expect(badges.has("Octo")).toBe(false);
  });

  it("writes one badge per ranking: public, all, commits and world", () => {
    const data = country("a", "Alpha", [row(1, "solo", 2)]);
    const badges = buildBadges(
      [{ ...data, tabs: { public: [row(4, "solo", 2)], all: [row(2, "solo", 2)], commits: [row(9, "solo", 2)] } }],
      512,
    );
    expect([...badges.keys()].sort()).toEqual(["solo", "solo.all", "solo.commits", "solo.world"]);
    expect(badges.get("solo")?.message).toBe("#4 Alpha (public contributions)");
    expect(badges.get("solo.all")).toMatchObject({ message: "#2 Alpha (all contributions)", color: "a0a8b0" });
    expect(badges.get("solo.commits")?.message).toBe("#9 Alpha (public commits)");
    expect(badges.get("solo.world")).toMatchObject({
      message: "#1 World (public contributions)",
      color: "d4a72c",
    });
  });

  it("breaks equal ranks by country title", () => {
    const badges = buildBadges([country("b", "Beta", [row(3, "x", 1)]), country("a", "Alpha", [row(3, "x", 1)])], 512);
    expect(badges.get("x")?.message).toBe("#3 Alpha (public contributions)");
  });

  it("ranks the world badge across countries; below the world top it reads unranked", () => {
    // contributions = 100 - rank: "b" (#1 in Beta, 99) is ahead of "a" (#2 in Alpha, 98).
    const countries = [country("a", "Alpha", [row(2, "a", 1)]), country("b", "Beta", [row(1, "b", 2), row(3, "c", 3)])];
    const badges = buildBadges(countries, 2);
    expect(badges.get("b.world")?.message).toBe("#1 World (public contributions)");
    expect(badges.get("a.world")).toMatchObject({ message: "#2 World (public contributions)", color: "a0a8b0" });
    expect(badges.get("c.world")).toMatchObject({ message: "World: unranked (public contributions)", color: "6e7781" });
    expect(badges.get("c")?.message).toBe("#3 Beta (public contributions)");
  });

  it("says unranked, with the country of the best rank, for a ranking the person is not in", () => {
    const data = country("a", "Alpha", [row(1, "solo", 2)]);
    const badges = buildBadges(
      [
        { ...data, tabs: { public: [], all: [row(2, "solo", 2)], commits: [] } },
        { ...country("b", "Beta", []), tabs: { public: [], all: [], commits: [row(1, "solo", 2)] } },
      ],
      512,
    );
    expect(badges.get("solo.all")?.message).toBe("#2 Alpha (all contributions)");
    expect(badges.get("solo.commits")?.message).toBe("#1 Beta (public commits)");
    expect(badges.get("solo")).toMatchObject({ message: "Alpha: unranked (public contributions)", color: "6e7781" });
    expect(badges.get("solo.world")?.message).toBe("World: unranked (public contributions)");
    expect(badges.size).toBe(4);
  });
});

describe("world ranking", () => {
  it("counts each person once, with their best country, re-ranked", () => {
    const rows = worldRanking(
      [country("a", "Alpha", [row(5, "Octo", 1)]), country("b", "Beta", [row(2, "octo", 1), row(3, "zed", 2)])],
      10,
    );
    expect(rows).toEqual([
      { rank: 1, login: "octo", id: 1, contributions: 98, country: "Beta" },
      { rank: 2, login: "zed", id: 2, contributions: 97, country: "Beta" },
    ]);
  });

  it("is the same whatever order the countries come in (the page and the badges load them differently)", () => {
    const alpha = country("a", "Alpha", [row(3, "x", 1), row(4, "B", 2)]);
    const beta = country("b", "Beta", [row(3, "x", 1), row(4, "a", 3)]);
    const forward = worldRanking([alpha, beta], 10);
    expect(worldRanking([beta, alpha], 10)).toEqual(forward);
    // Equal counts: the alphabetically first country; equal contributions: lowercase login order.
    expect(forward.map((r) => `${r.login}:${r.country}`)).toEqual(["x:Alpha", "a:Beta", "B:Alpha"]);
  });

  it("keeps at most topN rows and never a negative slice", () => {
    const data = [country("a", "Alpha", [row(1, "a", 1), row(2, "b", 2), row(3, "c", 3)])];
    expect(worldRanking(data, 2).map((r) => r.login)).toEqual(["a", "b"]);
    expect(worldRanking(data, -1)).toEqual([]);
  });
});

describe("commit farms", () => {
  const rule = {
    min_commits: 20000,
    ratio: 50,
    quiet_stars: 10,
    quiet_share: 0.6,
    popular_stars: 1000,
    popular_share: 0.5,
  };
  const activity = (commits: number, other = 0) => ({ commits, prs: other, issues: 0, reviews: 0, private: 0 });

  it("are a huge number of commits with almost nothing else", () => {
    expect(isLikelyAutomated(activity(1_567_142, 56), rule)).toBe(true);
    expect(isLikelyAutomated(activity(20_000, 0), rule)).toBe(true);
    // Heavy contributors with real pull request and review work are not.
    expect(isLikelyAutomated(activity(102_976, 13_126), rule)).toBe(false);
    expect(isLikelyAutomated(activity(55_596, 2_179), rule)).toBe(false);
    // Few commits are never a farm, however lopsided.
    expect(isLikelyAutomated(activity(19_999, 0), rule)).toBe(false);
  });

  it("are left out of the world ranking (their world badge reads unranked), but keep their country badges", () => {
    const data: CountryData = {
      ...country("a", "Alpha", [
        { rank: 1, login: "farm", id: 1, contributions: 900_000 },
        { rank: 2, login: "human", id: 2, contributions: 5_000 },
      ]),
      breakdown: { "1": activity(900_000, 3), "2": activity(3_000, 400) },
    };
    expect(worldRanking([data], 10, rule).map((r) => `${r.rank}:${r.login}`)).toEqual(["1:human"]);
    expect(worldRanking([data], 10).map((r) => r.login)).toEqual(["farm", "human"]);
    const badges = buildBadges([data], 10, rule);
    expect(badges.get("farm.world")?.message).toBe("World: unranked (public contributions)");
    expect(badges.get("human.world")?.message).toBe("#1 World (public contributions)");
    expect(badges.get("farm")?.message).toBe("#1 Alpha (public contributions)");
  });

  it("also catch one quiet repository of their own, unless most commits go to a widely used project", () => {
    // A farm that also opens pull requests: the ratio misses it, its one repository does not.
    const farm = { ...activity(86_462, 5_922) };
    expect(isLikelyAutomated(farm, rule)).toBe(false);
    expect(isLikelyAutomated({ ...farm, quiet: 54_532, popular: 0 }, rule)).toBe(true);
    expect(isLikelyAutomated({ ...farm, quiet: 40_000, popular: 0 }, rule)).toBe(false);
    // A maintainer committing straight to a big community project: almost no pull requests, still a person.
    const maintainer = activity(23_609, 120);
    expect(isLikelyAutomated(maintainer, rule)).toBe(true);
    expect(isLikelyAutomated({ ...maintainer, quiet: 0, popular: 23_424 }, rule)).toBe(false);
    expect(isLikelyAutomated({ ...maintainer, quiet: 0, popular: 11_000 }, rule)).toBe(true);
    // Below min_commits nothing counts, however quiet the repository.
    expect(isLikelyAutomated({ ...activity(19_999, 5_000), quiet: 19_999, popular: 0 }, rule)).toBe(false);
  });
});
