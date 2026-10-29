import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildQuery, fitsSearchLimits, freeTextLength, withFollowers } from "../collector/query.ts";
import { type CountFn, findThreshold, SEARCH_CAP, splitRanges } from "../collector/threshold.ts";

/** A fake search index: follower counts of every user matching the location. */
const counter = (followers: readonly number[]): CountFn => {
  return async ({ min, max }) => followers.filter((f) => f >= min && (max === null || f <= max)).length;
};

const followersArb = fc.array(fc.integer({ min: 0, max: 50_000 }), { maxLength: 4000 });

describe("buildQuery", () => {
  it("quotes include terms, negates excludes and starts with type:user", () => {
    const q = buildQuery({ title: "Mexico", iso: "MX", include: ["mexico", "mexico city"], exclude: ["new mexico"] });
    expect(q).toBe('type:user location:"mexico" location:"mexico city" -location:"new mexico"');
    expect(withFollowers(q, { min: 10, max: null })).toMatch(/ followers:>=10$/);
    expect(withFollowers(q, { min: 10, max: 99 })).toMatch(/ followers:10\.\.99$/);
  });

  it("counts only free text against the 256-character limit", () => {
    expect(freeTextLength('type:user location:"a b" -location:"c"')).toBe(0);
    expect(freeTextLength("hello type:user world")).toBe(11);
    expect(fitsSearchLimits(`${"x".repeat(257)} type:user`)).toBe(false);
  });
});

describe("findThreshold", () => {
  it("picks the smallest threshold with at most `consider` candidates", async () => {
    await fc.assert(
      fc.asyncProperty(followersArb, fc.integer({ min: 1, max: 1500 }), async (followers, consider) => {
        const count = counter(followers);
        const t = await findThreshold(count, consider);
        expect(await count({ min: t, max: null })).toBeLessThanOrEqual(consider);
        if (t > 0) expect(await count({ min: t - 1, max: null })).toBeGreaterThan(consider);
      }),
      { numRuns: 200 },
    );
  });

  it("returns 0 when everyone fits", async () => {
    expect(await findThreshold(counter([1, 2, 3]), 10)).toBe(0);
  });
});

describe("splitRanges", () => {
  it("covers every candidate exactly once with ranges under the search cap", async () => {
    await fc.assert(
      fc.asyncProperty(
        followersArb,
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 50, max: 1000 }),
        async (followers, min, cap) => {
          const count = counter(followers);
          const ranges = await splitRanges(count, min, cap);
          let covered = 0;
          for (const [i, r] of ranges.entries()) {
            const n = await count(r);
            covered += n;
            if (r.max === null || r.min !== r.max) expect(n).toBeLessThanOrEqual(cap);
            const next = ranges[i + 1];
            if (next && r.max !== null) expect(next.min).toBe(r.max + 1);
          }
          expect(covered).toBe(await count({ min, max: null }));
          expect(ranges[0]?.min).toBe(min);
          expect(ranges.at(-1)?.max).toBeNull();
        },
      ),
      { numRuns: 150 },
    );
  });

  it("keeps a single crowded follower value as one range", async () => {
    const crowded = Array.from({ length: SEARCH_CAP + 5 }, () => 7);
    const ranges = await splitRanges(counter(crowded), 7);
    expect(ranges.some((r) => r.min === 7 && r.max === 7)).toBe(true);
  });
});
