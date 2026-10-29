import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compactNumber, isMostlyPrivate, privateShare } from "../collector/flags.ts";

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
