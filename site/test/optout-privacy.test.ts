// #51: opt-outs of people in countries that keep failing; #52: the opt-out list hides who, how many and when.
import { describe, expect, it } from "vitest";
import type { CountryData } from "../src/collector/country-data.ts";
import { olderThan } from "../src/collector/freshness.ts";
import { type FetchLike, GitHubGraphQL } from "../src/collector/github.ts";
import { optoutHash } from "../src/collector/optout.ts";
import { decryptHashes, encryptHashes, parseHashes } from "../src/collector/optout-list.ts";
import { MAX_CHECKED, optedOutByStatus, publishedPeople } from "../src/collector/sweep.ts";
import { fakeClock, json, response } from "./fake-github.ts";

const KEY = "k".repeat(32);
const hashes = (n: number) => Array.from({ length: n }, (_, i) => optoutHash(i + 1, KEY));
const body = (text: string) => text.split("\n").filter((l) => l && !l.startsWith("#"))[0] ?? "";

describe("the encrypted opt-out list", () => {
  it("round-trips, and stores neither the hashes nor the IDs in the clear", () => {
    const list = hashes(3);
    const text = encryptHashes(list, KEY);
    expect(decryptHashes(text, KEY)).toEqual(new Set(list));
    for (const hash of list) expect(text).not.toContain(hash);
    expect(decryptHashes(encryptHashes([], KEY), KEY)).toEqual(new Set());
  });

  it("changes on every write and keeps one size for up to 256 entries, so it tells neither when nor how many", () => {
    const first = encryptHashes(hashes(5), KEY);
    expect(encryptHashes(hashes(5), KEY)).not.toBe(first);
    const sizes = new Set([0, 1, 5, 255, 256].map((n) => body(encryptHashes(hashes(n), KEY)).length));
    expect(sizes.size).toBe(1);
    expect(body(encryptHashes(hashes(257), KEY)).length).toBeGreaterThan(body(first).length);
  });

  it("refuses a wrong key or a damaged file instead of reading it as empty", () => {
    const text = encryptHashes(hashes(2), KEY);
    expect(() => decryptHashes(text, "x".repeat(32))).toThrow(/cannot be decrypted/);
    const raw = Buffer.from(body(text), "base64");
    raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 1;
    expect(() => decryptHashes(raw.toString("base64"), KEY)).toThrow(/cannot be decrypted/);
    for (const broken of ["", "# only a comment\n", "AAAA", Buffer.alloc(28).toString("base64")]) {
      expect(() => decryptHashes(broken, KEY), JSON.stringify(broken)).toThrow(/damaged/);
    }
    expect(() => encryptHashes(["not a hash"], KEY)).toThrow(/not a hash/);
  });

  it("carries over a legacy plain list exactly", () => {
    const legacy = `# header\n${hashes(4).join("\n")}\n`;
    expect(decryptHashes(encryptHashes(parseHashes(legacy), KEY), KEY)).toEqual(parseHashes(legacy));
  });
});

const row = (rank: number, login: string, id: number) => ({ rank, login, id, contributions: 1000 - rank });
const country = (slug: string, updatedAt: string, rows: ReturnType<typeof row>[]): CountryData => ({
  slug,
  title: slug,
  updatedAt,
  totalUsers: 1,
  considered: rows.length,
  minFollowers: 0,
  tabs: { public: rows, all: rows, commits: [] },
  breakdown: {},
});

describe("people checked by status", () => {
  it("takes everyone shown once, oldest country first, without fixtures, opted-out people or more than the cap", () => {
    const a = country("a", "2026-10-01T00:00:00.000Z", [row(1, "x", 1), row(2, "y", 2), row(3, "fixture", -3)]);
    const b = country("b", "2026-10-02T00:00:00.000Z", [row(1, "y", 2), row(2, "z", 3), row(3, "gone", 4)]);
    expect(publishedPeople([a, b], (id) => id === 4)).toEqual([
      { id: 1, login: "x" },
      { id: 2, login: "y" },
      { id: 3, login: "z" },
    ]);
    expect(publishedPeople([a, b], () => false, 2)).toHaveLength(2);
    expect(MAX_CHECKED).toBeGreaterThan(512);
  });

  it("only checks countries overdue for their collection", () => {
    const now = new Date("2026-11-03T12:00:00.000Z");
    const due = olderThan(
      [country("fresh", "2026-11-02T12:00:00.000Z", []), country("overdue", "2026-11-01T11:00:00.000Z", [])],
      now,
      48,
    );
    expect(due.map((c) => c.slug)).toEqual(["overdue"]);
  });

  /** A GraphQL API that answers user(login:) aliases from a table, and records each request. */
  function github(users: Record<string, { id: number; status: string | null }>) {
    const requests: { query: string; variables: Record<string, string> }[] = [];
    const fetch: FetchLike = async (_url, init) => {
      const request = JSON.parse(init.body ?? "{}") as { query: string; variables: Record<string, string> };
      requests.push(request);
      const data: Record<string, unknown> = {
        rateLimit: { cost: 1, limit: 5000, remaining: 4000, resetAt: "2030-01-01T00:00:00Z" },
      };
      for (const [name, login] of Object.entries(request.variables)) {
        const user = users[login.toLowerCase()];
        data[`u${name.slice(1)}`] = user
          ? { databaseId: user.id, status: user.status === null ? null : { message: user.status } }
          : null;
      }
      return response(json({ data, errors: [{ type: "NOT_FOUND", message: "Could not resolve" }] }));
    };
    return { requests, client: new GitHubGraphQL({ token: async () => "t", fetch, clock: fakeClock() }) };
  }
  const phrases = { optout: "contributors.top opt-out", optin: "contributors.top opt-in" };

  it("finds opt-outs by status, only for the same account, in batches, with logins as variables", async () => {
    const people = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, login: `user-${i + 1}` }));
    const { requests, client } = github({
      "user-2": { id: 2, status: "Contributors.top OPT-OUT please" },
      "user-3": { id: 3, status: "busy" },
      "user-4": { id: 999, status: "contributors.top opt-out" }, // the login now belongs to someone else
      "user-5": { id: 5, status: null },
      "user-55": { id: 55, status: "contributors.top opt-out" },
      "user-56": { id: 56, status: "contributors.top opt-in" },
    });
    expect(await optedOutByStatus(client, people, phrases)).toEqual([2, 55]);
    expect(requests.map((r) => Object.keys(r.variables).length)).toEqual([50, 10]);
    for (const r of requests) expect(r.query).not.toContain("user-");
  });

  it("checks nobody when nobody is shown", async () => {
    const { requests, client } = github({});
    expect(await optedOutByStatus(client, [], phrases)).toEqual([]);
    expect(requests).toHaveLength(0);
  });
});
