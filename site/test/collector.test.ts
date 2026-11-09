import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type Config, loadConfig } from "../src/collector/config.ts";
import { collectCountry } from "../src/collector/country.ts";
import { fetchPeople, fetchRepoActivity, fetchStatuses, TooManySkippedError } from "../src/collector/details.ts";
import { type Activity, isLikelyAutomated } from "../src/collector/flags.ts";
import { GitHubGraphQL } from "../src/collector/github.ts";
import { optoutHash } from "../src/collector/optout.ts";
import type { Preset } from "../src/collector/preset.ts";
import { findCandidates, IncompleteSearchError } from "../src/collector/search.ts";
import { FakeGitHub, type FakeUser, fakeClock, json } from "./fake-github.ts";

const KEY = "k".repeat(32);
const NOW = new Date(Date.UTC(2026, 9, 29, 12));

const preset = (include: string[], exclude: string[] = [], post_filter?: Record<string, string[]>): Preset => ({
  title: include[0] ?? "X",
  iso: null,
  include,
  exclude,
  ...(post_filter ? { post_filter } : {}),
});
const PRESETS = new Map<string, Preset>([
  ["atlantis", { ...preset(["atlantis", "poseidonia"]), title: "Atlantis" }],
  ["el_dorado", { ...preset(["el dorado", "manoa"]), title: "El Dorado" }],
]);

function config(
  overrides: { consider?: number; topN?: number; maxSkipped?: number; denylist?: number[] } = {},
): Config {
  const base = loadConfig();
  return {
    ...base,
    ranking: { ...base.ranking, consider: overrides.consider ?? 50, top_n: overrides.topN ?? 20 },
    collector: { ...base.collector, max_skipped_per_country: overrides.maxSkipped ?? 5 },
    denylist_ids: overrides.denylist ?? [],
  };
}

function client(github: FakeGitHub) {
  return new GitHubGraphQL({ token: async () => "t", fetch: github.fetch, clock: fakeClock() });
}

const user = (id: number, location: string | null, followers: number, extra: Partial<FakeUser> = {}): FakeUser => ({
  id,
  login: `user-${id}`,
  location,
  followers,
  total: (id * 37) % 500,
  restricted: (id * 11) % 50,
  commits: (id * 13) % 300,
  prs: id % 7,
  issues: id % 5,
  reviews: id % 3,
  ...extra,
});

// ---------------------------------------------------------------- oracle
// An independent, brute-force description of what a country's data must be.

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
function firstMention(location: string, terms: readonly string[]): number {
  const hay = words(location);
  let best = Number.POSITIVE_INFINITY;
  for (const term of terms) {
    const needle = words(term);
    for (let i = 0; i < hay.length; i++) if (needle.every((t, j) => hay[i + j] === t)) best = Math.min(best, i);
  }
  return best;
}

/** One country per person: the one mentioned first; ties go to the alphabetically first slug. */
function owns(slug: string, location: string): boolean {
  const mine = firstMention(location, (PRESETS.get(slug) as Preset).include);
  return [...PRESETS].every(([other, op]) => {
    const theirs = firstMention(location, op.include);
    return other === slug || theirs > mine || (theirs === mine && other > slug);
  });
}

const byLogin = (a: FakeUser, b: FakeUser) => {
  const [x, y] = [a.login.toLowerCase(), b.login.toLowerCase()];
  return x < y ? -1 : x > y ? 1 : 0;
};

function oracle(users: FakeUser[], slug: string, cfg: Config, optedOutIds: Set<number>) {
  const p = PRESETS.get(slug) as Preset;
  const matches = users.filter(
    (u) =>
      !u.org &&
      u.location !== null &&
      firstMention(u.location, p.include) < Number.POSITIVE_INFINITY &&
      firstMention(u.location, p.exclude) === Number.POSITIVE_INFINITY,
  );
  let threshold = 0;
  while (matches.filter((u) => u.followers >= threshold).length > cfg.ranking.consider) threshold++;
  const statusSays = (u: FakeUser, phrase: string) => (u.status ?? "").toLowerCase().includes(phrase);
  const kept = matches.filter((u) => {
    if (u.followers < threshold || cfg.denylist_ids.includes(u.id)) return false;
    if (optedOutIds.has(u.id) && !statusSays(u, "contributor.top opt-in")) return false;
    if (statusSays(u, "contributor.top opt-out")) return false;
    return owns(slug, u.location as string);
  });
  // Public and private together only for people whose public share reaches min_public_share.
  const pub = (u: FakeUser) => Math.max(0, (u.total ?? 0) - (u.restricted ?? 0));
  const priv = (u: FakeUser) => Math.max(0, u.restricted ?? 0);
  const enoughPublic = kept.filter((u) => priv(u) === 0 || pub(u) / (pub(u) + priv(u)) >= cfg.ranking.min_public_share);
  const order = (score: (u: FakeUser) => number, pool = kept) =>
    [...pool]
      .sort((a, b) => score(b) - score(a) || b.followers - a.followers || byLogin(a, b) || a.id - b.id)
      .slice(0, cfg.ranking.top_n)
      .map((u, i) => ({ rank: i + 1, login: u.login, id: u.id, contributions: score(u) }));
  return {
    threshold,
    totalUsers: matches.length,
    considered: kept.length,
    public: order(pub),
    all: order((u) => u.total ?? 0, enoughPublic),
    commits: order((u) => u.commits ?? 0),
  };
}

// ---------------------------------------------------------------- search

describe("finding candidates", () => {
  const population = [
    ...Array.from({ length: 120 }, (_, i) => user(i + 1, i % 2 ? "Atlantis" : "Poseidonia, Atlantis", i)),
    user(500, "Atlantis", 1000, { org: true }),
    user(501, "New Atlantis Labs", 999),
    user(502, "Atlantisville", 998),
  ];

  it("takes the most-followed users by threshold, never organizations, regardless of result order", async () => {
    const github = new FakeGitHub(population);
    const { found, threshold, totalUsers } = await findCandidates(
      client(github),
      PRESETS.get("atlantis") as Preset,
      30,
    );
    expect(threshold).toBe(91); // followers 91..119 + "New Atlantis Labs" (999) = 30 users
    expect(found).toHaveLength(30);
    expect(found.map((f) => f.id)).toContain(501); // "atlantis" as a whole word
    expect(found.map((f) => f.id)).not.toContain(502); // "Atlantisville" is not
    expect(found.map((f) => f.id)).not.toContain(500); // organization
    expect(totalUsers).toBe(121);
    expect(found[0]?.followers).toBe(999); // sorted by followers, not by search order
  });

  it("honours exclude terms", async () => {
    const github = new FakeGitHub(population);
    const { found } = await findCandidates(client(github), preset(["atlantis"], ["new atlantis"]), 1000);
    expect(found.map((f) => f.id)).not.toContain(501);
  });

  it("splits follower ranges when more than 1000 candidates are wanted", async () => {
    const many = Array.from({ length: 2600 }, (_, i) => user(i + 1, "Atlantis", i % 400));
    const github = new FakeGitHub(many);
    const { found } = await findCandidates(client(github), PRESETS.get("atlantis") as Preset, 2500);
    const threshold = [...Array(401).keys()].find((t) => many.filter((u) => u.followers >= t).length <= 2500) ?? 0;
    expect(found).toHaveLength(many.filter((u) => u.followers >= threshold).length);
    expect(new Set(found.map((f) => f.id)).size).toBe(found.length);
    expect(threshold).toBe(15); // 2600 users, followers 0..399: 7 each below 200, so >= 15 leaves 2495
    expect(github.calls.filter((c) => c.kind === "page").every((c) => c.size <= 100)).toBe(true);
  });

  it("tolerates a few accounts missing from result pages but not many", async () => {
    const users = Array.from({ length: 100 }, (_, i) => user(i + 1, "Atlantis", i));
    const few = new FakeGitHub(users);
    for (const id of [1, 2, 3]) few.hiddenFromPages.add(id);
    expect((await findCandidates(client(few), preset(["atlantis"]), 100)).found).toHaveLength(97);

    const many = new FakeGitHub(users);
    for (let id = 1; id <= 10; id++) many.hiddenFromPages.add(id);
    await expect(findCandidates(client(many), preset(["atlantis"]), 100)).rejects.toBeInstanceOf(IncompleteSearchError);
  });

  it("fails on search errors and unexpected shapes instead of publishing partial data", async () => {
    const errored = new FakeGitHub(population);
    errored.queued.push(json({ data: null, errors: [{ message: "Something went wrong" }] }));
    await expect(findCandidates(client(errored), preset(["atlantis"]), 10)).rejects.toThrow(/search failed/);

    const odd = new FakeGitHub(population);
    odd.queued.push(json({ data: { search: { userCount: "many" } } }));
    await expect(findCandidates(client(odd), preset(["atlantis"]), 10)).rejects.toThrow(/unexpected shape/);
  });
});

// ---------------------------------------------------------------- details

describe("loading details", () => {
  const users = Array.from({ length: 23 }, (_, i) => user(i + 1, "Atlantis", 10));
  const found = users.map((u) => ({ id: u.id, nodeId: `U_${u.id}`, login: u.login, followers: u.followers }));

  it("halves heavy batches until they pass and grows back afterwards", async () => {
    const github = new FakeGitHub(users);
    github.heavyAbove = 3;
    const { people, skipped } = await fetchPeople(client(github), found, { batchSize: 10, maxSkipped: 0 });
    expect(people.map((p) => p.id)).toEqual(users.map((u) => u.id));
    expect(skipped).toBe(0);
    const sizes = github.calls.filter((c) => c.kind === "details").map((c) => c.size);
    expect(sizes.slice(0, 3)).toEqual([10, 5, 2]); // shrink…
    expect(sizes).toContain(4); // …and grow back (2 → 4) after successes
    expect(Math.max(...sizes.filter((_, i) => i > 2))).toBeLessThanOrEqual(10);
  });

  it("skips a user that fails even alone, and keeps everyone else", async () => {
    const github = new FakeGitHub(users);
    github.heavyIds.add(7);
    const { people, skipped } = await fetchPeople(client(github), found, { batchSize: 10, maxSkipped: 1 });
    expect(skipped).toBe(1);
    expect(people.map((p) => p.id)).toEqual(users.map((u) => u.id).filter((id) => id !== 7));
  });

  it("gives up on the country when too many users fail", async () => {
    const github = new FakeGitHub(users);
    for (const id of [3, 9, 15]) github.heavyIds.add(id);
    await expect(fetchPeople(client(github), found, { batchSize: 10, maxSkipped: 2 })).rejects.toBeInstanceOf(
      TooManySkippedError,
    );
  });

  it("treats a 502 like a heavy batch", async () => {
    const github = new FakeGitHub(users);
    github.queued.push({ status: 502, body: "" }, { status: 502, body: "" });
    const { people } = await fetchPeople(client(github), found, { batchSize: 10, maxSkipped: 0 });
    expect(people).toHaveLength(23);
  });

  it("drops accounts deleted or turned into organizations since the search", async () => {
    const github = new FakeGitHub([...users.slice(0, 20), { ...user(21, "Atlantis", 10), org: true }]);
    const { people, skipped } = await fetchPeople(client(github), found, { batchSize: 10, maxSkipped: 0 });
    expect(people).toHaveLength(20); // 21 is an organization now, 22 and 23 no longer exist
    expect(skipped).toBe(0);
  });

  it("reads statuses in cheap batches of 50", async () => {
    const many = Array.from({ length: 120 }, (_, i) => user(i + 1, "Atlantis", 1, { status: i === 5 ? "hi" : null }));
    const github = new FakeGitHub(many);
    const statuses = await fetchStatuses(
      client(github),
      many.map((u) => ({ id: u.id, nodeId: `U_${u.id}`, login: u.login, followers: 1 })),
    );
    expect(github.calls.map((c) => c.size)).toEqual([50, 50, 20]);
    expect(statuses.get(6)).toBe("hi");
    expect(statuses.get(7)).toBeNull();
  });
});

describe("rate limits while loading details", () => {
  it("does not shrink batches or skip people because of a rate limit", async () => {
    const users = Array.from({ length: 5 }, (_, i) => user(i + 1, "Atlantis", 1));
    const github = new FakeGitHub(users);
    for (let i = 0; i < 5; i++) github.queued.push(json({ message: "too many" }, 429));
    const found = users.map((u) => ({ id: u.id, nodeId: `U_${u.id}`, login: u.login, followers: 1 }));
    const c = new GitHubGraphQL({ token: async () => "t", fetch: github.fetch, clock: fakeClock() });
    await expect(fetchPeople(c, found, { batchSize: 10, maxSkipped: 0 })).rejects.toMatchObject({ status: 429 });
    expect(github.calls).toEqual([]);
  });
});

// ---------------------------------------------------------------- one country

describe("collecting a country", () => {
  it("matches the oracle on a hand-made population with every kind of edge case", async () => {
    const users: FakeUser[] = [
      ...Array.from({ length: 60 }, (_, i) => user(i + 1, i % 3 ? "Atlantis" : "Poseidonia", 5 + i)),
      user(100, "El Dorado / Atlantis", 500), // belongs to El Dorado: mentioned first
      user(101, "Atlantis, then El Dorado", 400), // belongs to Atlantis
      user(102, "Atlantis", 300, { status: "contributor.top opt-out 🙏" }), // opts out now
      user(103, "Atlantis", 200), // opted out before, silent
      user(104, "Atlantis", 199, { status: "Contributor.top OPT-IN" }), // opted out before, comes back
      user(105, "Atlantis", 198), // denylisted
      user(106, "Atlantis", 197, { total: 50, restricted: 80 }), // API glitch: never negative
      user(107, "Atlantis", 196, { total: 1000, restricted: 991 }), // 0.9% public: not in "all"
      user(108, "Atlantis", 195, { total: 1000, restricted: 990 }), // exactly 1% public: in "all"
    ];
    const cfg = config({ consider: 50, topN: 100, denylist: [105] }); // everyone ranked, so 106 is visible
    const hashes = new Set([optoutHash(103, KEY), optoutHash(104, KEY)]);
    const github = new FakeGitHub(users);
    const result = await collectCountry(client(github), {
      slug: "atlantis",
      presets: PRESETS,
      config: cfg,
      optout: { key: KEY, hashes },
      now: NOW,
    });
    const expected = oracle(users, "atlantis", cfg, new Set([103, 104]));
    expect(result.data.tabs.public).toEqual(expected.public);
    expect(result.data.tabs.all).toEqual(expected.all);
    expect(result.data.tabs.commits).toEqual(expected.commits);
    expect(result.data.minFollowers).toBe(expected.threshold);
    expect(result.data.totalUsers).toBe(expected.totalUsers);
    expect(result.optedOut).toEqual([{ id: 102, hash: optoutHash(102, KEY) }]);
    expect(result.optedIn).toEqual([optoutHash(104, KEY)]);
    expect(result.stats).toMatchObject({ denied: 1, otherCountry: 1 });
    expect(result.data.tabs.public.find((r) => r.id === 106)?.contributions).toBe(0);
    const inAll = (id: number) => result.data.tabs.all.some((r) => r.id === id);
    expect([106, 107, 108].map(inAll)).toEqual([false, false, true]);
    expect(result.data.tabs.public.some((r) => r.id === 107)).toBe(true);
  });

  it("publishes nothing it must not: no location, no status, breakdown only for ranked people", async () => {
    const users = Array.from({ length: 40 }, (_, i) =>
      user(i + 1, `Poseidonia secret-place-${i}`, i, { status: `busy ${i}` }),
    );
    const github = new FakeGitHub(users);
    const { data } = await collectCountry(client(github), {
      slug: "atlantis",
      presets: PRESETS,
      config: config({ consider: 40, topN: 10 }),
      optout: { key: KEY, hashes: new Set() },
      now: NOW,
    });
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/secret-place|busy|location|status/);
    const ranked = new Set(Object.values(data.tabs).flatMap((rows) => rows.map((r) => String(r.id))));
    expect(new Set(Object.keys(data.breakdown))).toEqual(ranked);
    expect(data.presetChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(data.updatedAt).toBe(NOW.toISOString());
  });

  it("neither asks GitHub for display names nor publishes any", async () => {
    const users = Array.from({ length: 12 }, (_, i) => user(i + 1, "Poseidonia", 1));
    const github = new FakeGitHub(users);
    const { data } = await collectCountry(client(github), {
      slug: "atlantis",
      presets: PRESETS,
      config: config({ consider: 40, topN: 10 }),
      optout: { key: KEY, hashes: new Set() },
      now: NOW,
    });
    expect(data.tabs.public.length).toBeGreaterThan(0);
    expect(data).not.toHaveProperty("names");
    expect(github.queries.some((q) => q.split(/[^A-Za-z]+/).includes("name"))).toBe(false);
  });

  it("applies post_filter only to people matched by its term", async () => {
    const presets = new Map([
      ["georgia", { ...preset(["georgia", "tbilisi"], [], { georgia: [", ga", "usa"] }), title: "Georgia" }],
    ]);
    const users = [
      user(1, "Atlanta, GA, Georgia", 10),
      user(2, "Tbilisi, Georgia", 10),
      user(3, "Georgia, USA", 10),
      user(4, "Tbilisi (not the USA)", 10),
    ];
    const { data, stats } = await collectCountry(client(new FakeGitHub(users)), {
      slug: "georgia",
      presets,
      config: config(),
      optout: { key: KEY, hashes: new Set() },
      now: NOW,
    });
    expect(data.tabs.public.map((r) => r.id).sort()).toEqual([2, 4]);
    expect(stats.postFiltered).toBe(2);
  });

  it("reads repositories only above min_commits, keeps only counts, and survives a failed read", async () => {
    const users = [
      // A farm that also opens pull requests: most commits in one quiet repository of its own.
      user(1, "Atlantis", 10, {
        commits: 90_000,
        prs: 6_000,
        repos: [
          { owner: "USER-1", stars: 3, commits: 60_000 },
          { owner: "user-1", stars: 2, commits: 20_000 },
          { owner: "someone", stars: 5_000, commits: 1_000 },
        ],
      }),
      // A maintainer committing straight to a big project of someone else, with few pull requests.
      user(2, "Atlantis", 10, {
        commits: 25_000,
        prs: 100,
        repos: [
          { owner: "big-org", stars: 2_000, commits: 24_000 },
          { owner: "user-2", stars: 500, commits: 900 },
        ],
      }),
      user(3, "Atlantis", 10, { commits: 30_000, prs: 0, reposFail: true }),
      user(4, "Atlantis", 10, { commits: 19_999, prs: 0 }),
      // A distribution packager: a release tool commits to a repository nobody stars, of a big organization.
      user(5, "Atlantis", 10, {
        commits: 30_000,
        prs: 100,
        repos: [{ owner: "distro", stars: 20, orgTopStars: 8_000, commits: 27_000 }],
      }),
      // Generated pages pushed to an organization of its own that nobody stars either.
      user(6, "Atlantis", 10, {
        commits: 30_000,
        prs: 4,
        repos: [{ owner: "docs-dump", stars: 0, orgTopStars: 8, commits: 29_000 }],
      }),
    ];
    const github = new FakeGitHub(users);
    const cfg = config();
    const { data, stats } = await collectCountry(client(github), {
      slug: "atlantis",
      presets: PRESETS,
      config: cfg,
      optout: { key: KEY, hashes: new Set() },
      now: NOW,
    });
    expect(data.breakdown["1"]).toMatchObject({ quiet: 60_000, popular: 1_000 });
    expect(data.breakdown["2"]).toMatchObject({ quiet: 0, popular: 24_000 });
    expect(data.breakdown["3"]).not.toHaveProperty("quiet");
    expect(data.breakdown["4"]).not.toHaveProperty("quiet");
    expect(data.breakdown["5"]).toMatchObject({ quiet: 0, popular: 27_000 });
    expect(data.breakdown["6"]).toMatchObject({ quiet: 0, popular: 0 });
    expect(JSON.stringify(data)).not.toMatch(/big-org|someone|distro|docs-dump/);
    // One request for each account above min_commits (3 fails twice, each retried once by the client), none below it.
    expect(github.calls.filter((c) => c.kind === "repos")).toHaveLength(8);
    expect(stats.repoFailed).toBe(1);
    const rule = cfg.ranking.automated;
    const flagged = (id: number) => isLikelyAutomated(data.breakdown[String(id)] as Activity, rule);
    expect([1, 2, 3, 4, 5, 6].map(flagged)).toEqual([true, false, true, false, false, true]);
  });

  it("drops a repository read that comes back for another account (renamed since)", async () => {
    const github = new FakeGitHub([user(7, "Atlantis", 10, { commits: 50_000, repos: [] })]);
    const person = { id: 8, login: "user-7", followers: 1, total: 0, restricted: 0, commits: 50_000, prs: 0 };
    const { activity, failed } = await fetchRepoActivity(
      client(github),
      [{ ...person, issues: 0, reviews: 0, location: null, status: null }],
      config().ranking.automated,
    );
    expect(activity.size).toBe(0);
    expect(failed).toBe(1);
  });

  it("rejects unknown countries", async () => {
    await expect(
      collectCountry(client(new FakeGitHub([])), {
        slug: "narnia",
        presets: PRESETS,
        config: config(),
        optout: { key: KEY, hashes: new Set() },
        now: NOW,
      }),
    ).rejects.toThrow(/unknown country/);
  });

  it("property: for any population the result equals the oracle", async () => {
    const places = [
      "Atlantis",
      "Poseidonia",
      "El Dorado",
      "Manoa",
      "Atlantis / El Dorado",
      "Manoa, Atlantis",
      "Nowhere",
    ];
    const statuses = [null, "contributor.top opt-out", "contributor.top opt-in", "hello"];
    const arbUser = fc.record({
      place: fc.constantFrom(...places),
      followers: fc.nat(40),
      total: fc.nat(300),
      restricted: fc.nat(100),
      commits: fc.nat(200),
      status: fc.constantFrom(...statuses),
      org: fc.nat(14).map((n) => n === 0),
      optedOutBefore: fc.nat(7).map((n) => n === 0),
    });
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbUser, { maxLength: 80 }),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 30 }),
        async (specs, consider, topN) => {
          const users = specs.map((s, i) =>
            user(i + 1, s.place, s.followers, {
              login: `u${(i * 7) % 13}-${i}`,
              total: s.total,
              restricted: s.restricted,
              commits: s.commits,
              status: s.status,
              org: s.org,
            }),
          );
          const optedOutIds = new Set(users.filter((_, i) => specs[i]?.optedOutBefore).map((u) => u.id));
          const cfg = config({ consider, topN });
          for (const slug of ["atlantis", "el_dorado"]) {
            const result = await collectCountry(client(new FakeGitHub(users)), {
              slug,
              presets: PRESETS,
              config: cfg,
              optout: { key: KEY, hashes: new Set([...optedOutIds].map((id) => optoutHash(id, KEY))) },
              now: NOW,
            });
            const expected = oracle(users, slug, cfg, optedOutIds);
            expect(result.data.tabs.public).toEqual(expected.public);
            expect(result.data.tabs.all).toEqual(expected.all);
            expect(result.data.tabs.commits).toEqual(expected.commits);
            expect(result.data.considered).toBe(expected.considered);
            expect(result.data.minFollowers).toBe(expected.threshold);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});
