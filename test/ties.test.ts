// Deterministic tests for tie-breaking and other branches that random inputs only hit by chance.
import { describe, expect, it } from "vitest";
import { buildBadges } from "../collector/badges.ts";
import type { CountryData } from "../collector/country-data.ts";
import { freeTextLength } from "../collector/query.ts";
import { type Candidate, rank, TABS } from "../collector/rank.ts";
import { matchingPresets } from "../collector/stuffing.ts";

const c = (id: number, login: string, total: number, followers: number): Candidate => ({
  id,
  login,
  followers,
  total,
  restricted: 0,
  commits: 0,
  prs: 0,
  issues: 0,
  reviews: 0,
});
const order = (cs: Candidate[]) => rank(cs, TABS.all, 10).map((r) => r.id);

describe("rank tie-breaking", () => {
  it("score first", () => expect(order([c(1, "a", 1, 9), c(2, "b", 5, 0)])).toEqual([2, 1]));
  it("then followers", () => expect(order([c(1, "a", 5, 1), c(2, "b", 5, 9)])).toEqual([2, 1]));
  it("then login, in both input orders", () => {
    expect(order([c(1, "b", 5, 1), c(2, "a", 5, 1)])).toEqual([2, 1]);
    expect(order([c(2, "a", 5, 1), c(1, "b", 5, 1)])).toEqual([2, 1]);
  });
  it("login ties ignore case; then id", () => {
    expect(order([c(9, "Octo", 5, 1), c(3, "octo", 5, 1)])).toEqual([3, 9]);
    expect(order([c(3, "octo", 5, 1), c(9, "Octo", 5, 1)])).toEqual([3, 9]);
  });
  it("orders by code point, not by locale (hyphen before letters)", () => {
    expect(order([c(1, "ab", 5, 1), c(2, "a-b", 5, 1)])).toEqual([2, 1]);
  });
});

describe("other branches", () => {
  it("free text of an empty query is empty", () => {
    expect(freeTextLength("")).toBe(0);
    expect(freeTextLength("   ")).toBe(0);
  });

  it("countries mentioned at the same position are ordered by slug", () => {
    const p = (include: string[]) => ({ title: "X", iso: null, include, exclude: [] });
    const presets = new Map([
      ["zeta", p(["springfield"])],
      ["alpha", p(["springfield"])],
    ]);
    expect(matchingPresets("Springfield", presets)).toEqual(["alpha", "zeta"]);
  });

  it("badge ties go to the alphabetically first country, whatever the input order", () => {
    const country = (slug: string, title: string): CountryData => ({
      slug,
      title,
      updatedAt: "2026-10-28T12:00:00.000Z",
      totalUsers: 1,
      considered: 1,
      minFollowers: 0,
      tabs: { public: [{ rank: 2, login: "x", id: 1, contributions: 1 }], all: [], commits: [] },
      breakdown: {},
    });
    for (const input of [
      [country("a", "Alpha"), country("b", "Beta")],
      [country("b", "Beta"), country("a", "Alpha")],
    ]) {
      expect(buildBadges(input).get("x")?.message).toBe("#2 Alpha (public contributions)");
    }
  });
});
