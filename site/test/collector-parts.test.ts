import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { appBotIdentity, appJwt, installationToken } from "../src/collector/app-token.ts";
import { breakerReasons } from "../src/collector/breaker.ts";
import type { CountryData } from "../src/collector/country-data.ts";
import { AuthError, type FetchLike } from "../src/collector/github.ts";
import { mentionsAny, purgeCountry } from "../src/collector/optout-list.ts";
import { type Preset, presetChecksum } from "../src/collector/preset.ts";
import { dueCountries } from "../src/collector/queue.ts";
import { fakeClock, json, response } from "./fake-github.ts";

const rows = (ids: number[], start = 1000) =>
  ids.map((id, i) => ({ rank: i + 1, login: `u${id}`, id, contributions: start - i }));
function country(ids: number[], extra: Partial<CountryData> = {}): CountryData {
  return {
    slug: "atlantis",
    title: "Atlantis",
    updatedAt: "2026-10-28T12:00:00.000Z",
    totalUsers: 5000,
    considered: ids.length,
    minFollowers: 40,
    tabs: { public: rows(ids), all: rows(ids), commits: rows(ids) },
    breakdown: Object.fromEntries(
      ids.map((id) => [String(id), { commits: 1, prs: 1, issues: 1, reviews: 1, private: 0 }]),
    ),
    ...extra,
  };
}
const limits = { max_candidate_drop: 0.5, max_top_change: 0.6, max_threshold_jump: 3 };
const range = (n: number, from = 1) => Array.from({ length: n }, (_, i) => from + i);

describe("circuit breaker", () => {
  it("lets the first collection and normal changes through", () => {
    expect(breakerReasons(undefined, country([]), limits)).toEqual([]);
    expect(breakerReasons(country(range(200)), country([...range(150), ...range(50, 1000)]), limits)).toEqual([]);
  });

  it("holds back an empty, collapsed, reshuffled or re-thresholded result", () => {
    const before = country(range(200));
    expect(breakerReasons(before, country([]), limits)).toEqual([
      "the ranking came back empty",
      "candidates dropped from 200 to 0",
      "100% of the top 100 changed",
    ]);
    expect(breakerReasons(before, country(range(90)), limits)).toEqual(["candidates dropped from 200 to 90"]);
    expect(breakerReasons(before, country(range(200, 5000)), limits)).toEqual(["100% of the top 100 changed"]);
    expect(breakerReasons(before, country(range(200), { minFollowers: 130 }), limits)).toEqual([
      "the follower threshold moved from 40 to 130",
    ]);
    expect(breakerReasons(before, country(range(200), { minFollowers: 10 }), limits)).toEqual([
      "the follower threshold moved from 40 to 10",
    ]);
  });

  it("does not judge a reshuffle on a handful of rows", () => {
    expect(breakerReasons(country(range(5)), country(range(5, 100)), limits)).toEqual([]);
  });
});

describe("queue", () => {
  const p = (term: string): Preset => ({ title: term, iso: null, include: [term], exclude: [] });
  const presets = new Map([
    ["a", p("a1")],
    ["b", p("b1")],
    ["c", p("c1")],
    ["d", p("d1")],
    ["e", p("e1")],
  ]);
  const now = new Date("2026-10-29T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const sum = (slug: string) => presetChecksum(presets.get(slug) as Preset);

  it("orders new, changed, then stalest, and skips recently refreshed countries", () => {
    const existing = new Map([
      ["a", { updatedAt: hoursAgo(50), presetChecksum: sum("a") }],
      ["b", { updatedAt: hoursAgo(1), presetChecksum: "0".repeat(64) }],
      ["c", { updatedAt: hoursAgo(10), presetChecksum: sum("c") }],
      ["d", { updatedAt: hoursAgo(70), presetChecksum: sum("d") }],
    ]);
    expect(dueCountries({ presets, existing, now, minRefreshHours: 40 })).toEqual([
      { slug: "e", reason: "new" },
      { slug: "b", reason: "preset-changed" },
      { slug: "d", reason: "stale" },
      { slug: "a", reason: "stale" },
    ]);
  });

  it("re-queues data without a checksum and treats a broken date as very old", () => {
    const existing = new Map([
      ["a", { updatedAt: hoursAgo(1) }],
      ["b", { updatedAt: "not a date", presetChecksum: sum("b") }],
      ["c", { updatedAt: hoursAgo(41), presetChecksum: sum("c") }],
    ]);
    const due = dueCountries({ presets: new Map([...presets].slice(0, 3)), existing, now, minRefreshHours: 40 });
    expect(due).toEqual([
      { slug: "a", reason: "preset-changed" },
      { slug: "b", reason: "stale" },
      { slug: "c", reason: "stale" },
    ]);
  });

  it("serves requested countries first and as asked, and rejects unknown ones", () => {
    const due = dueCountries({ presets, existing: new Map(), now, minRefreshHours: 40, requested: ["c", "a", "c"] });
    expect(due).toEqual([
      { slug: "c", reason: "requested" },
      { slug: "a", reason: "requested" },
    ]);
    expect(() => dueCountries({ presets, existing: new Map(), now, minRefreshHours: 40, requested: ["zz"] })).toThrow(
      /unknown countries: zz/,
    );
  });
});

describe("opt-out list", () => {
  it("purges people everywhere, moves everyone below up and drops their breakdown", () => {
    const data = country([10, 20, 30, 40]);
    const purged = purgeCountry(data, new Set([20, 99]));
    expect(purged.tabs.public.map((r) => [r.rank, r.id])).toEqual([
      [1, 10],
      [2, 30],
      [3, 40],
    ]);
    expect(purged.tabs.commits.map((r) => r.id)).toEqual([10, 30, 40]);
    expect(Object.keys(purged.breakdown)).toEqual(["10", "30", "40"]);
    expect(mentionsAny(data, new Set([20]))).toBe(true);
    expect(mentionsAny(purged, new Set([20]))).toBe(false);
  });
});

describe("GitHub App token", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

  it("signs a short-lived RS256 JWT for the App", () => {
    const jwt = appJwt("123", pem, Date.UTC(2026, 9, 29, 12));
    const [header, payload, signature] = jwt.split(".") as [string, string, string];
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
    expect(claims.iss).toBe("123");
    expect(claims.exp - claims.iat).toBe(600);
    expect(createVerify("RSA-SHA256").update(`${header}.${payload}`).verify(publicKey, signature, "base64url")).toBe(
      true,
    );
  });

  function api(expiresInMs: number) {
    const clock = fakeClock();
    const calls: string[] = [];
    let issued = 0;
    const fetch: FetchLike = async (url, init) => {
      calls.push(`${init.method} ${url.replace("https://api.github.com", "")}`);
      if (url.endsWith("/installation")) return response(json({ id: 42 }));
      if (url.endsWith("/access_tokens")) {
        expect(JSON.parse(init.body ?? "{}")).toEqual({
          repositories: ["contributor.top"],
          permissions: { contents: "write", actions: "write" },
        });
        return response(
          json({ token: `ghs_${++issued}`, expires_at: new Date(clock.now() + expiresInMs).toISOString() }),
        );
      }
      if (url.endsWith("/app")) return response(json({ slug: "contributors-top-collector" }));
      if (url.includes("/users/")) {
        expect(init.headers["Authorization"]).toBeUndefined();
        return response(json({ id: 777 }));
      }
      return response(json({ message: "Not Found" }, 404));
    };
    return { clock, calls, fetch };
  }

  it("issues a repository- and permission-scoped installation token, caches it and refreshes it before it expires", async () => {
    const { clock, calls, fetch } = api(3_600_000);
    const token = installationToken({
      appId: "1",
      privateKey: pem,
      repo: "contributor-top/contributor.top",
      fetch,
      clock,
    });
    expect(await token()).toBe("ghs_1");
    await clock.sleep(40 * 60_000);
    expect(await token()).toBe("ghs_1"); // 20 minutes left: still fine
    await clock.sleep(15 * 60_000);
    expect(await token()).toBe("ghs_2"); // 5 minutes left: refreshed
    expect(calls.filter((c) => c.startsWith("POST"))).toHaveLength(2);
    expect(calls[0]).toBe("GET /repos/contributor-top/contributor.top/installation");
  });

  it("fails loudly when the App is not installed or the key is wrong", async () => {
    const { clock } = api(0);
    const denied: FetchLike = async () => response(json({ message: "Bad credentials" }, 401));
    const token = installationToken({ appId: "1", privateKey: pem, repo: "o/r", fetch: denied, clock });
    await expect(token()).rejects.toBeInstanceOf(AuthError);
  });

  it("retries a token endpoint that is down instead of ending the run", async () => {
    const { clock, fetch } = api(3_600_000);
    let failures = 2;
    const flaky: FetchLike = async (url, init) => {
      if (url.endsWith("/access_tokens") && failures-- > 0) return response(json({ message: "Server Error" }, 502));
      return fetch(url, init);
    };
    const token = installationToken({
      appId: "1",
      privateKey: pem,
      repo: "contributor-top/contributor.top",
      fetch: flaky,
      clock,
    });
    expect(await token()).toBe("ghs_1");
    expect(clock.sleeps).toEqual([5000, 10_000]);

    const down: FetchLike = async () => response(json({}, 503));
    const never = installationToken({ appId: "1", privateKey: pem, repo: "o/r", fetch: down, clock });
    const error = await never().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(AuthError);
  });

  it("knows its bot identity for commits", async () => {
    const { clock, fetch } = api(0);
    expect(await appBotIdentity({ appId: "1", privateKey: pem, fetch, clock })).toEqual({
      name: "contributors-top-collector[bot]",
      email: "777+contributors-top-collector[bot]@users.noreply.github.com",
    });
  });
});
