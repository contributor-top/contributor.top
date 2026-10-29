import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { badgeColor, buildBadges } from "../src/collector/badges.ts";
import { type CountryData, countryDataSchema } from "../src/collector/country-data.ts";
import { dataDir, loadCountries, presetsDir } from "../src/collector/data-dir.ts";

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
    expect([1, 2, 3, 4].map(badgeColor)).toEqual(["d4a72c", "a0a8b0", "b87333", "0969da"]);
  });

  it("keys by lowercase login and keeps the best rank across countries", () => {
    const badges = buildBadges([
      country("a", "Alpha", [row(5, "Octo", 1), row(1, "solo", 2)]),
      country("b", "Beta", [row(2, "octo", 1)]),
    ]);
    expect(badges.get("octo")?.message).toBe("#2 Beta (public contributions)");
    expect(badges.get("solo")).toMatchObject({
      schemaVersion: 1,
      message: "#1 Alpha (public contributions)",
      color: "d4a72c",
      namedLogo: "github",
    });
    expect(badges.has("Octo")).toBe(false);
  });

  it("writes one badge per ranking: public, all and commits", () => {
    const data = country("a", "Alpha", [row(1, "solo", 2)]);
    const badges = buildBadges([
      { ...data, tabs: { public: [row(4, "solo", 2)], all: [row(2, "solo", 2)], commits: [row(9, "solo", 2)] } },
    ]);
    expect([...badges.keys()].sort()).toEqual(["solo", "solo.all", "solo.commits"]);
    expect(badges.get("solo")?.message).toBe("#4 Alpha (public contributions)");
    expect(badges.get("solo.all")).toMatchObject({ message: "#2 Alpha (all contributions)", color: "a0a8b0" });
    expect(badges.get("solo.commits")?.message).toBe("#9 Alpha (public commits)");
  });

  it("breaks equal ranks by country title", () => {
    const badges = buildBadges([country("b", "Beta", [row(3, "x", 1)]), country("a", "Alpha", [row(3, "x", 1)])]);
    expect(badges.get("x")?.message).toBe("#3 Alpha (public contributions)");
  });
});
