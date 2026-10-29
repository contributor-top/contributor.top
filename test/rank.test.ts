import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type Candidate, minFollowers, rank, TABS } from "../collector/rank.ts";

const candidateArb = fc.record({
  id: fc.integer({ min: 1, max: 1_000_000 }),
  login: fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/),
  followers: fc.integer({ min: 0, max: 1000 }),
  total: fc.integer({ min: 0, max: 5000 }),
  restricted: fc.integer({ min: 0, max: 5000 }),
  commits: fc.integer({ min: 0, max: 5000 }),
  prs: fc.nat(500),
  issues: fc.nat(500),
  reviews: fc.nat(500),
});

const uniqueCandidates = fc
  .uniqueArray(candidateArb, { selector: (c) => c.id, maxLength: 300 })
  .map((cs) => cs.map((c) => ({ ...c, total: c.total + c.restricted })));

describe("rank", () => {
  it("is sorted by score, then followers, then login, with ranks 1..n", () => {
    fc.assert(
      fc.property(uniqueCandidates, fc.integer({ min: 1, max: 600 }), (cs, topN) => {
        const rows = rank(cs, TABS.public, topN);
        expect(rows.length).toBe(Math.min(topN, cs.length));
        expect(rows.map((r) => r.rank)).toEqual(rows.map((_, i) => i + 1));
        const byId = new Map(cs.map((c) => [c.id, c]));
        for (let i = 1; i < rows.length; i++) {
          const a = rows[i - 1];
          const b = rows[i];
          if (!a || !b) continue;
          expect(a.contributions).toBeGreaterThanOrEqual(b.contributions);
          if (a.contributions === b.contributions) {
            expect(byId.get(a.id)?.followers).toBeGreaterThanOrEqual(byId.get(b.id)?.followers ?? 0);
          }
        }
      }),
    );
  });

  it("does not depend on input order", () => {
    fc.assert(
      fc.property(uniqueCandidates, (cs) => {
        const forward = rank(cs, TABS.all, 512);
        const backward = rank([...cs].reverse(), TABS.all, 512);
        expect(backward).toEqual(forward);
      }),
    );
  });

  it("scores tabs as documented", () => {
    const c: Candidate = {
      id: 1,
      login: "a",
      followers: 1,
      total: 100,
      restricted: 30,
      commits: 40,
      prs: 1,
      issues: 1,
      reviews: 1,
    };
    expect(TABS.public(c)).toBe(70);
    expect(TABS.all(c)).toBe(100);
    expect(TABS.commits(c)).toBe(40);
  });

  it("reports the honest follower threshold", () => {
    expect(minFollowers([])).toBe(0);
    const base = { login: "x", total: 0, restricted: 0, commits: 0, prs: 0, issues: 0, reviews: 0 };
    expect(
      minFollowers([
        { ...base, id: 1, followers: 12 },
        { ...base, id: 2, followers: 11 },
      ]),
    ).toBe(11);
  });
});
