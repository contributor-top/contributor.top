// GraphQL client for api.github.com: primary and secondary rate limits, retries and a time budget.
// All I/O (fetch, clock) is injectable so the behaviour is tested without the network.

export type HttpResponse = {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<HttpResponse>;

export type Clock = { now(): number; sleep(ms: number): Promise<void> };

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export type GraphQLError = { readonly type?: string; readonly message: string };

/** Waiting any longer would overrun the run's time budget; the caller stops cleanly. */
export class OutOfTimeError extends Error {}

/** The token is wrong or revoked: retrying cannot help. */
export class AuthError extends Error {}

/** A request that kept failing (5xx, non-JSON, network). Callers may retry with a smaller batch. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Every query asks for its own cost, so the client can keep the budget without extra requests. */
export const RATE_LIMIT = "rateLimit { cost limit remaining resetAt }";

type RateLimit = { cost: number; limit: number; remaining: number; resetAt: string };

type Outcome =
  | { kind: "done"; data: unknown; errors: GraphQLError[] }
  | { kind: "retry"; status: number; waitMs: number };

export type ClientOptions = {
  readonly token: () => Promise<string>;
  readonly fetch?: FetchLike;
  readonly clock?: Clock;
  /** Pause between requests: one request at a time, never a burst. */
  readonly pauseMs?: number;
  /** Below this share of the hourly limit, wait for the reset (the rest is kept for manual work). */
  readonly budgetFloor?: number;
  /** Epoch ms; a wait that would pass it throws OutOfTimeError instead. */
  readonly deadline?: number;
  readonly maxAttempts?: number;
};

const ENDPOINT = "https://api.github.com/graphql";
const SECONDARY_MIN_WAIT_MS = 60_000;

export class GitHubGraphQL {
  readonly usage = { requests: 0, cost: 0, remaining: Number.NaN, limit: Number.NaN };
  private readonly fetch: FetchLike;
  private readonly clock: Clock;
  private resetAt = 0;
  private lastRequestAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly options: ClientOptions) {
    this.fetch = options.fetch ?? ((url, init) => fetch(url, init));
    this.clock = options.clock ?? systemClock;
  }

  async query<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<{ data: T | null; errors: GraphQLError[] }> {
    const attempts = this.options.maxAttempts ?? 5;
    let lastStatus = 0;
    for (let attempt = 0; attempt < attempts; attempt++) {
      await this.beforeRequest();
      const outcome = await this.attempt(query, variables, attempt);
      if (outcome.kind === "done") return { data: outcome.data as T | null, errors: outcome.errors };
      lastStatus = outcome.status;
      await this.wait(outcome.waitMs);
    }
    throw new ApiError(`GitHub request failed after ${attempts} attempts`, lastStatus);
  }

  /** One request: either a result, or how long to wait before the next attempt. Fatal cases throw. */
  private async attempt(query: string, variables: Record<string, unknown>, attempt: number): Promise<Outcome> {
    let response: HttpResponse;
    try {
      response = await this.fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `bearer ${await this.options.token()}`,
          "Content-Type": "application/json",
          "User-Agent": "contributors.top-collector",
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch {
      return { kind: "retry", status: 0, waitMs: backoff(attempt) };
    }
    this.usage.requests++;
    const json = parseJson(await response.text());
    const { status } = response;

    if (status === 401) throw new AuthError("GitHub rejected the token (401)");
    if (status === 403 || status === 429) {
      const waitMs = this.rateLimitWait(response, json, attempt);
      if (waitMs === null) throw new ApiError(`GitHub refused the request (${status})`, status);
      return { kind: "retry", status, waitMs };
    }
    // 502/504 usually mean the query was too heavy: retry once, then let the caller shrink it.
    if (status >= 500 || json === null || typeof json !== "object") {
      if (attempt >= 1) throw new ApiError(`GitHub returned ${status} without a usable body`, status);
      return { kind: "retry", status, waitMs: backoff(attempt) };
    }

    const body = json as { data?: unknown; errors?: GraphQLError[] };
    this.record((body.data as { rateLimit?: RateLimit } | null | undefined)?.rateLimit);
    const errors = Array.isArray(body.errors) ? body.errors : [];
    if (errors.some((e) => e.type === "RATE_LIMITED")) {
      return { kind: "retry", status, waitMs: Math.max(this.resetAt - this.clock.now(), SECONDARY_MIN_WAIT_MS) };
    }
    return { kind: "done", data: body.data ?? null, errors };
  }

  /** Paces requests and keeps the reserve: below the floor, sleep until the hourly window resets. */
  private async beforeRequest(): Promise<void> {
    const pause = this.lastRequestAt + (this.options.pauseMs ?? 0) - this.clock.now();
    if (pause > 0) await this.wait(pause);
    const floor = (this.options.budgetFloor ?? 0) * this.usage.limit;
    if (this.usage.remaining < floor && this.resetAt > this.clock.now()) {
      await this.wait(this.resetAt - this.clock.now() + 1000);
      this.usage.remaining = this.usage.limit;
    }
    this.lastRequestAt = this.clock.now();
  }

  private record(rate: RateLimit | undefined): void {
    if (!rate) return;
    this.usage.cost += rate.cost;
    this.usage.remaining = rate.remaining;
    this.usage.limit = rate.limit;
    const reset = Date.parse(rate.resetAt);
    if (Number.isFinite(reset)) this.resetAt = reset;
  }

  /**
   * How long to wait after a 403/429, or null when it is a plain "forbidden". Secondary limits say
   * retry-after (at least a minute, doubling); an exhausted primary limit says when it resets.
   */
  private rateLimitWait(response: HttpResponse, json: unknown, attempt: number): number | null {
    const retryAfter = Number(response.headers.get("retry-after"));
    if (retryAfter > 0) return Math.max(retryAfter * 1000, SECONDARY_MIN_WAIT_MS) * 2 ** attempt;
    if (response.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
      return Math.max(reset - this.clock.now(), 0) + 1000;
    }
    const message = (json as { message?: unknown } | null)?.message;
    if (response.status === 429 || (typeof message === "string" && /rate limit/i.test(message))) {
      return SECONDARY_MIN_WAIT_MS * 2 ** attempt;
    }
    return null;
  }

  private async wait(ms: number): Promise<void> {
    const deadline = this.options.deadline;
    if (deadline !== undefined && this.clock.now() + ms > deadline) {
      throw new OutOfTimeError(`waiting ${Math.round(ms / 1000)}s would pass the run's time budget`);
    }
    await this.clock.sleep(ms);
  }
}

const backoff = (attempt: number) => 5000 * 2 ** attempt;

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
