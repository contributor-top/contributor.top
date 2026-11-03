import { createSign } from "node:crypto";
import { AuthError, type Clock, type FetchLike, systemClock } from "./github.ts";

const API = "https://api.github.com";
/** Installation tokens live one hour; a run lasts up to five, so refresh well before expiry. */
const REFRESH_BEFORE_MS = 10 * 60_000;

const b64url = (s: string) => Buffer.from(s).toString("base64url");

/** A GitHub App JWT (RS256), valid for 9 minutes, backdated a minute for clock drift. */
export function appJwt(appId: string, privateKey: string, nowMs: number): string {
  const now = Math.floor(nowMs / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }),
  )}`;
  return `${unsigned}.${createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url")}`;
}

type AppAuth = { appId: string; privateKey: string; fetch?: FetchLike; clock?: Clock };

const ATTEMPTS = 4;

/**
 * One REST call. Network errors and 5xx are retried (a token refresh in hour three must not end the run);
 * 401/403/404 mean wrong key, App or installation and fail at once as AuthError.
 */
const requestInit = (method: string, bearer: string | null, body: unknown) => ({
  method,
  headers: {
    ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }),
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "contributor.top-collector",
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
  },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

async function rest<T>(auth: AppAuth, method: string, path: string, bearer: string | null, body?: unknown): Promise<T> {
  const fetchFn: FetchLike = auth.fetch ?? ((url, init) => fetch(url, init));
  const clock = auth.clock ?? systemClock;
  const init = requestInit(method, bearer, body);
  let problem = "";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await clock.sleep(5000 * 2 ** (attempt - 1));
    const response = await fetchFn(`${API}${path}`, init).catch(() => null);
    if (response && response.status < 300) return JSON.parse(await response.text()) as T;
    if (response && [401, 403, 404].includes(response.status)) {
      throw new AuthError(`GitHub App authentication failed: ${method} ${path} → ${response.status}`);
    }
    problem = response ? String(response.status) : "network error";
  }
  throw new Error(`GitHub App API unavailable: ${method} ${path} → ${problem}`);
}

const TOKEN_PERMISSIONS = { contents: "write", actions: "write" } as const;

/**
 * Token source for one repository, from the App's ID and private key: finds the installation,
 * issues a token limited to that repository and re-issues it before it expires. The token is also limited to the
 * two permissions the collector uses (pushing the data branches, dispatching the deploy), so it stays that narrow
 * even if the App is later granted more.
 */
export function installationToken(auth: AppAuth & { repo: string }): () => Promise<string> {
  const clock = auth.clock ?? systemClock;
  const [, name] = auth.repo.split("/");
  let cached: { token: string; expiresAt: number } | null = null;
  return async () => {
    if (cached && cached.expiresAt - clock.now() > REFRESH_BEFORE_MS) return cached.token;
    const jwt = appJwt(auth.appId, auth.privateKey, clock.now());
    const { id } = await rest<{ id: number }>(auth, "GET", `/repos/${auth.repo}/installation`, jwt);
    const issued = await rest<{ token: string; expires_at: string }>(
      auth,
      "POST",
      `/app/installations/${id}/access_tokens`,
      jwt,
      { repositories: [name], permissions: TOKEN_PERMISSIONS },
    );
    cached = { token: issued.token, expiresAt: Date.parse(issued.expires_at) };
    return issued.token;
  };
}

/** The App's bot identity for commits: "<slug>[bot]" and its noreply address. */
export async function appBotIdentity(auth: AppAuth): Promise<{ name: string; email: string }> {
  const clock = auth.clock ?? systemClock;
  const { slug } = await rest<{ slug: string }>(auth, "GET", "/app", appJwt(auth.appId, auth.privateKey, clock.now()));
  const name = `${slug}[bot]`;
  // A public endpoint: it does not accept the App JWT.
  const { id } = await rest<{ id: number }>(auth, "GET", `/users/${encodeURIComponent(name)}`, null);
  return { name, email: `${id}+${name}@users.noreply.github.com` };
}
