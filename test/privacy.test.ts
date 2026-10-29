import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decide, optoutHash, statusMatches } from "../src/collector/optout.ts";
import type { Preset } from "../src/collector/preset.ts";
import { scrub } from "../src/collector/scrub.ts";
import { countsFor, matchingPresets } from "../src/collector/stuffing.ts";

const KEY = "k".repeat(32);

describe("optoutHash", () => {
  it("is stable, keyed and distinct per id", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 2 ** 31 }), (id) => {
        expect(optoutHash(id, KEY)).toBe(optoutHash(id, KEY));
        expect(optoutHash(id, KEY)).not.toBe(optoutHash(id, `${KEY}x`));
        expect(optoutHash(id, KEY)).toMatch(/^[0-9a-f]{64}$/);
      }),
    );
    expect(optoutHash(1, KEY)).not.toBe(optoutHash(2, KEY));
  });

  it("refuses bad ids and short keys", () => {
    expect(() => optoutHash(0, KEY)).toThrow(RangeError);
    expect(() => optoutHash(1.5, KEY)).toThrow(RangeError);
    expect(() => optoutHash(1, "short")).toThrow(RangeError);
  });
});

describe("status phrases", () => {
  const out = "contributors.top opt-out";
  const inn = "contributors.top opt-in";

  it("matches the phrase anywhere, case- and spacing-insensitively", () => {
    expect(statusMatches("Contributors.top   OPT-OUT please 🙏", out)).toBe(true);
    expect(statusMatches("busy", out)).toBe(false);
    expect(statusMatches(null, out)).toBe(false);
    expect(statusMatches(undefined, out)).toBe(false);
  });

  it("opting out wins when both phrases are present", () => {
    expect(decide(`${inn} ${out}`, out, inn)).toBe("opt-out");
    expect(decide(inn, out, inn)).toBe("opt-in");
    expect(decide("hello", out, inn)).toBe("none");
  });
});

describe("scrub", () => {
  it("redacts logins in GitHub error shapes and known logins", () => {
    const msg = "Could not resolve to a User with the login of 'secret-user'. See https://github.com/secret-user";
    const out = scrub(msg);
    expect(out).not.toContain("secret-user");
    expect(out).toContain("login of '[redacted]'");
    expect(scrub('user(login: "abc") failed')).toBe('user(login: "[redacted]") failed');
    expect(scrub("avatars.githubusercontent.com/abc")).toBe("avatars.githubusercontent.com/[redacted]");
  });

  it("redacts known logins as whole words only", () => {
    expect(scrub("skipped Bob-1 and bob-12", ["bob-1"])).toBe("skipped [redacted] and bob-12");
    expect(scrub("a.b+c?", ["a.b+c?"])).toBe("[redacted]");
    expect(scrub("x", ["x"])).toBe("x");
  });

  it("never leaks a known login", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z][a-z0-9]{2,15}$/), fc.string(), (login, noise) => {
        expect(scrub(`${noise} ${login} ${noise}`, [login]).toLowerCase()).not.toMatch(
          new RegExp(`(^|[^a-z0-9-])${login}([^a-z0-9-]|$)`),
        );
      }),
    );
  });
});

describe("location stuffing", () => {
  const p = (title: string, include: string[]): Preset => ({ title, iso: null, include, exclude: [] });
  const presets = new Map<string, Preset>([
    ["belarus", p("Belarus", ["belarus", "minsk"])],
    ["estonia", p("Estonia", ["estonia", "tallinn"])],
    ["peru", p("Peru", ["peru", "lima"])],
    ["nigeria", p("Nigeria", ["nigeria"])],
  ]);

  it("finds presets by whole words, in the order they are mentioned", () => {
    expect(matchingPresets("Minsk, Belarus", presets)).toEqual(["belarus"]);
    expect(matchingPresets("Lima → Tallinn → Minsk", presets)).toEqual(["peru", "estonia", "belarus"]);
    expect(matchingPresets("Niger", presets)).toEqual([]);
    expect(matchingPresets(null, presets)).toEqual([]);
  });

  it("a person belongs only to the country mentioned first", () => {
    expect(countsFor("belarus", "Minsk, Belarus / Tallinn, Estonia", presets)).toBe(true);
    expect(countsFor("estonia", "Minsk, Belarus / Tallinn, Estonia", presets)).toBe(false);
    expect(countsFor("estonia", "Tallinn, Estonia", presets)).toBe(true);
    const stuffed = "uk mx peru estonia belarus nigeria";
    expect(countsFor("peru", stuffed, presets)).toBe(true);
    for (const slug of ["estonia", "belarus", "nigeria"]) expect(countsFor(slug, stuffed, presets)).toBe(false);
  });

  it("keeps the person when none of our terms is recognised", () => {
    expect(countsFor("estonia", "Somewhere unknown", presets)).toBe(true);
    expect(countsFor("estonia", null, presets)).toBe(true);
  });

  it("assigns everyone to at most one country", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("minsk", "tallinn", "lima", "nigeria", "x", "/"), { maxLength: 8 }),
        (parts) => {
          const location = parts.join(" ");
          if (matchingPresets(location, presets).length === 0) return; // unrecognised: kept by whichever search found it
          const owners = [...presets.keys()].filter((slug) => countsFor(slug, location, presets));
          expect(owners).toHaveLength(1);
        },
      ),
    );
  });
});
