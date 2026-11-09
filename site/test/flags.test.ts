import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  automatedReason,
  compactNumber,
  hasEnoughPublic,
  isMostlyPrivate,
  privateShare,
} from "../src/collector/flags.ts";

describe("privateShare", () => {
  it("is the private part of all contributions, 0 when there are none", () => {
    expect(privateShare(20, 80)).toBe(0.8);
    expect(privateShare(0, 0)).toBe(0);
    fc.assert(
      fc.property(fc.nat(1e6), fc.nat(1e6), (pub, priv) => {
        const s = privateShare(pub, priv);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("flags only rows at or above the threshold with some private activity", () => {
    expect(isMostlyPrivate(20, 80, 0.8)).toBe(true);
    expect(isMostlyPrivate(21, 79, 0.8)).toBe(false);
    expect(isMostlyPrivate(0, 0, 0.8)).toBe(false);
    expect(isMostlyPrivate(0, 5, 0.8)).toBe(true);
  });
});

describe("automatedReason", () => {
  const rule = {
    min_commits: 20000,
    ratio: 50,
    quiet_stars: 10,
    quiet_share: 0.6,
    popular_stars: 1000,
    popular_share: 0.5,
  };
  const a = { commits: 30000, prs: 0, issues: 0, reviews: 0 };

  it("names the rule that marks an account, so its tooltip can show the numbers", () => {
    expect(automatedReason(a, rule)).toBe("ratio");
    expect(automatedReason({ ...a, prs: 1000, quiet: 18000 }, rule)).toBe("quiet");
    expect(automatedReason({ ...a, prs: 1000, quiet: 17999 }, rule)).toBeNull();
    expect(automatedReason({ ...a, prs: 1000 }, rule)).toBeNull();
    expect(automatedReason({ ...a, commits: 19999 }, rule)).toBeNull();
    expect(automatedReason({ ...a, popular: 15000 }, rule)).toBeNull();
  });
});

describe("hasEnoughPublic", () => {
  it("needs the share of public contributions, exactly at the boundary, and nothing without private ones", () => {
    expect(hasEnoughPublic(10, 990, 0.01)).toBe(true);
    expect(hasEnoughPublic(9, 991, 0.01)).toBe(false);
    expect(hasEnoughPublic(0, 72086, 0.01)).toBe(false);
    expect(hasEnoughPublic(0, 0, 0.01)).toBe(true);
    expect(hasEnoughPublic(5, 0, 0.01)).toBe(true);
  });
});

describe("compactNumber", () => {
  it("formats like 999, 2.3k, 12k, 1.3M", () => {
    expect([0, 999, 1000, 2345, 12_000, 999_499, 1_250_000, 15_000_000].map(compactNumber)).toEqual([
      "0",
      "999",
      "1k",
      "2.3k",
      "12k",
      "999k",
      "1.3M",
      "15M",
    ]);
  });
});
