import { describe, expect, it } from "vitest";
import { ApiError, AuthError, GitHubGraphQL, OutOfTimeError, RATE_LIMIT } from "../src/collector/github.ts";
import { FakeGitHub, fakeClock, json } from "./fake-github.ts";

const Q = `query($q: String!) { search(type: USER, query: $q, first: 0) { userCount } ${RATE_LIMIT} }`;
const vars = { q: 'type:user location:"atlantis"' };
const people = [{ id: 1, login: "a", location: "Atlantis", followers: 3 }];

function setup(options: Partial<ConstructorParameters<typeof GitHubGraphQL>[0]> = {}) {
  const github = new FakeGitHub(people);
  const clock = fakeClock();
  const client = new GitHubGraphQL({ token: async () => "t", fetch: github.fetch, clock, ...options });
  return { github, clock, client };
}

describe("GitHub GraphQL client", () => {
  it("returns data and tracks cost and remaining budget", async () => {
    const { client } = setup();
    const { data, errors } = await client.query<{ search: { userCount: number } }>(Q, vars);
    expect(data?.search.userCount).toBe(1);
    expect(errors).toEqual([]);
    expect(client.usage).toMatchObject({ requests: 1, cost: 1, remaining: 4999, limit: 5000 });
  });

  it("waits at least a minute on a secondary rate limit (retry-after), doubling each time", async () => {
    const { github, clock, client } = setup();
    github.queued.push(json({ message: "secondary rate limit" }, 403, { "Retry-After": "5" }));
    github.queued.push(json({ message: "secondary rate limit" }, 403, { "Retry-After": "90" }));
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([60_000, 180_000]);
  });

  it("treats 429 and a rate-limit message without retry-after as a secondary limit", async () => {
    const { github, clock, client } = setup();
    github.queued.push(json({ message: "too many" }, 429));
    github.queued.push(json({ message: "You have exceeded a secondary rate limit" }, 403));
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([60_000, 120_000]);
  });

  it("waits for the reset when the primary limit is exhausted", async () => {
    const { github, clock, client } = setup();
    const reset = Math.floor(clock.now() / 1000) + 600;
    github.queued.push(json({}, 403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) }));
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([601_000]);
  });

  it("does not retry a plain 403 or a 401", async () => {
    const forbidden = setup();
    forbidden.github.queued.push(json({ message: "Resource not accessible" }, 403));
    await expect(forbidden.client.query(Q, vars)).rejects.toBeInstanceOf(ApiError);
    const unauthorized = setup();
    unauthorized.github.queued.push(json({ message: "Bad credentials" }, 401));
    await expect(unauthorized.client.query(Q, vars)).rejects.toBeInstanceOf(AuthError);
    expect(unauthorized.github.calls).toEqual([]);
  });

  it("retries a 5xx or a non-JSON body once, then hands it to the caller", async () => {
    const once = setup();
    once.github.queued.push({ status: 502, body: "<html>Bad gateway</html>" });
    expect((await once.client.query<{ search: unknown }>(Q, vars)).data?.search).toBeDefined();

    const twice = setup();
    twice.github.queued.push({ status: 502, body: "" }, { status: 200, body: "not json" });
    await expect(twice.client.query(Q, vars)).rejects.toMatchObject({ status: 200 });
  });

  it("retries network errors", async () => {
    const { github, client, clock } = setup();
    let failures = 2;
    const flaky: typeof github.fetch = async (url, init) => {
      if (failures-- > 0) throw new TypeError("fetch failed");
      return github.fetch(url, init);
    };
    const c = new GitHubGraphQL({ token: async () => "t", fetch: flaky, clock });
    expect((await c.query<{ search: unknown }>(Q, vars)).data).not.toBeNull();
    expect(clock.sleeps).toEqual([5000, 10_000]);
    expect(client.usage.requests).toBe(0);
  });

  it("gives up after the allowed attempts", async () => {
    const { github, client } = setup({ maxAttempts: 3 });
    for (let i = 0; i < 3; i++) github.queued.push(json({}, 429, { "retry-after": "1" }));
    await expect(client.query(Q, vars)).rejects.toThrow(/after 3 attempts/);
  });

  it("waits out a RATE_LIMITED GraphQL error until the reset", async () => {
    const { github, clock, client } = setup();
    github.resetAt = new Date(clock.now() + 300_000).toISOString();
    await client.query(Q, vars); // learns resetAt
    github.queued.push(json({ data: null, errors: [{ type: "RATE_LIMITED", message: "API rate limit exceeded" }] }));
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([300_000]);
  });

  it("keeps the reserve: below the budget floor it sleeps until the hourly reset", async () => {
    const { github, clock, client } = setup({ budgetFloor: 0.1 });
    github.remaining = 501; // the next request leaves 500 = 10%
    github.resetAt = new Date(clock.now() + 1_200_000).toISOString();
    await client.query(Q, vars);
    await client.query(Q, vars); // 499 < 500 after this one
    expect(clock.sleeps).toEqual([]);
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([1_201_000]);
  });

  it("paces requests", async () => {
    const { clock, client } = setup({ pauseMs: 1000 });
    await client.query(Q, vars);
    await client.query(Q, vars);
    expect(clock.sleeps).toEqual([1000]);
  });

  it("never waits past the run's deadline", async () => {
    const { github, clock } = setup();
    const client = new GitHubGraphQL({
      token: async () => "t",
      fetch: github.fetch,
      clock,
      deadline: clock.now() + 30_000,
    });
    github.queued.push(json({}, 429));
    await expect(client.query(Q, vars)).rejects.toBeInstanceOf(OutOfTimeError);
    expect(clock.sleeps).toEqual([]);
  });

  it("sends the token from the token source on every request", async () => {
    const seen: string[] = [];
    const github = new FakeGitHub(people);
    let n = 0;
    const client = new GitHubGraphQL({
      token: async () => `token-${++n}`,
      fetch: async (url, init) => {
        seen.push(init.headers["Authorization"] ?? "");
        return github.fetch(url, init);
      },
      clock: fakeClock(),
    });
    await client.query(Q, vars);
    await client.query(Q, vars);
    expect(seen).toEqual(["bearer token-1", "bearer token-2"]);
  });
});
