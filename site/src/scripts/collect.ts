// The collector run: refreshes the countries that are due, within the time budget, and publishes them.
//
// Environment:
//   COLLECTOR_APP_ID, COLLECTOR_APP_KEY  GitHub App credentials (CI); otherwise GITHUB_TOKEN or `gh auth token`
//   OPTOUT_KEY        HMAC key of the opt-out list (at least 32 characters, required)
//   COUNTRIES         comma-separated slugs to refresh now instead of the queue
//   FORCE=true        publish even when the circuit breaker objects
//   PUBLISH=true      commit and push the data and optout branches, then trigger a deploy (CI only)
//   DATA_DIR, OPTOUT_DIR  working copies (default ../.data and ../.optout)
//   MAX_MINUTES       override freshness.max_run_minutes
//   HEALTHCHECK_URL   pinged at the end (/fail when nothing could be collected)
// Logs carry slugs and counts only: no logins, IDs or locations.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appBotIdentity, installationToken } from "../collector/app-token.ts";
import { breakerReasons } from "../collector/breaker.ts";
import { loadConfig } from "../collector/config.ts";
import { collectCountry } from "../collector/country.ts";
import type { CountryData } from "../collector/country-data.ts";
import { loadCountries } from "../collector/data-dir.ts";
import { AuthError, GitHubGraphQL, OutOfTimeError } from "../collector/github.ts";
import { optoutHash } from "../collector/optout.ts";
import { mentionsAny, parseHashes, purgeCountry, serializeHashes } from "../collector/optout-list.ts";
import { loadPresets } from "../collector/preset.ts";
import { dueCountries } from "../collector/queue.ts";
import { scrub } from "../collector/scrub.ts";
import { BranchStore, type Identity } from "./branch-store.ts";

const env = process.env;
const config = loadConfig();
const repo = config.site.repo;
const publish = env["PUBLISH"] === "true";
const force = env["FORCE"] === "true";
const started = Date.now();
const deadline = started + Number(env["MAX_MINUTES"] || config.freshness.max_run_minutes) * 60_000;
/** Do not start a country with less time than this left: a big one takes 10–15 minutes. */
const COUNTRY_RESERVE_MS = 20 * 60_000;
/** Redeploy at most this often while a run is publishing countries. */
const DEPLOY_EVERY_MS = 60 * 60_000;

const optoutKey = env["OPTOUT_KEY"] ?? "";
if (optoutKey.length < 32) throw new Error("OPTOUT_KEY must be set (at least 32 characters)");

const appId = env["COLLECTOR_APP_ID"];
const appKey = env["COLLECTOR_APP_KEY"];
const appToken = appId && appKey ? installationToken({ appId, privateKey: appKey, repo }) : null;
const token: () => Promise<string> =
  appToken ?? (async () => env["GITHUB_TOKEN"] || execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim());
const identity: Identity | null = appId && appKey ? await appBotIdentity({ appId, privateKey: appKey }) : null;
if (publish && !appToken) throw new Error("PUBLISH needs the GitHub App credentials");

const dataStore = new BranchStore(env["DATA_DIR"] || "../.data", "data", repo, publish ? token : null, identity);
const optoutStore = new BranchStore(
  env["OPTOUT_DIR"] || "../.optout",
  "optout",
  repo,
  publish ? token : null,
  identity,
);
if (publish) await Promise.all([dataStore.prepare(), optoutStore.prepare()]);
mkdirSync(join(dataStore.dir, "countries"), { recursive: true });
mkdirSync(optoutStore.dir, { recursive: true });

const hashesFile = join(optoutStore.dir, "hashes.txt");
/** Read without a separate existence check (no window between check and use); missing means the first run. */
function readHashes(): Set<string> {
  try {
    return parseHashes(readFileSync(hashesFile, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return new Set();
    throw e;
  }
}
const hashes = readHashes();
/** What this run changed in the opt-out list; applied on top of the file, so hashes added by others survive. */
const optoutDelta = { added: new Set<string>(), removed: new Set<string>() };
function writeHashes(): void {
  const merged = readHashes();
  for (const hash of optoutDelta.added) merged.add(hash);
  for (const hash of optoutDelta.removed) merged.delete(hash);
  for (const hash of merged) hashes.add(hash);
  writeFileSync(hashesFile, serializeHashes(merged));
}

const presets = loadPresets("../presets", config.reserved_slugs);
const countries = new Map(loadCountries(dataStore.dir).map((c) => [c.slug, c]));
/** Countries this run wrote: after a rejected push they are written again on top of GitHub's version. */
const touched = new Set<string>();
function writeCountry(data: CountryData): void {
  touched.add(data.slug);
  writeFileSync(join(dataStore.dir, "countries", `${data.slug}.json`), `${JSON.stringify(data)}\n`);
}
const rewriteCountries = () => {
  for (const slug of touched) writeCountry(countries.get(slug) as CountryData);
};

/** Someone left the data in this run, so the previous snapshot must not stay public as data-prev. */
let privacyChanged = false;
function purge(slug: string, data: CountryData, ids: ReadonlySet<number>): void {
  const purged = purgeCountry(data, ids);
  countries.set(slug, purged);
  writeCountry(purged);
  privacyChanged = true;
}
// Everyone on the opt-out list leaves the published data now, however they were added (status, issue, by hand).
for (const [slug, data] of countries) {
  const ids = new Set(
    Object.values(data.tabs)
      .flat()
      .map((r) => r.id)
      .filter((id) => id > 0 && hashes.has(optoutHash(id, optoutKey))),
  );
  if (ids.size > 0) purge(slug, data, ids);
}

// One client per worker: each paces its own requests; the budget floor follows the shared rate limit.
const clients = Array.from(
  { length: config.collector.parallel_countries },
  () =>
    new GitHubGraphQL({
      token,
      pauseMs: config.collector.pause_ms,
      budgetFloor: config.collector.budget_floor,
      deadline,
    }),
);
const requested = (env["COUNTRIES"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const queue = dueCountries({
  presets,
  existing: countries,
  now: new Date(),
  minRefreshHours: config.freshness.min_refresh_hours,
  requested,
});

type Line = { slug: string; result: string; minutes: string; cost: number };
const report: Line[] = [];
let updated = 0;
let failed = 0;
let lastDeploy = started;

/** Triggers the deploy workflow; a failure is logged, never fatal (the next run deploys again). */
async function deploy(): Promise<void> {
  if (!publish || !appToken) return;
  lastDeploy = Date.now();
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await appToken()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    });
    if (response.status !== 204) console.log(`deploy dispatch returned ${response.status}`);
  } catch (e) {
    console.log(`deploy dispatch failed: ${scrub(e instanceof Error ? e.message : String(e))}`);
  }
}

/** New opt-outs leave every country at once, not at each country's next update. */
function applyOptouts(optedOut: { id: number; hash: string }[], optedIn: string[]): void {
  for (const hash of optedIn) {
    hashes.delete(hash);
    optoutDelta.removed.add(hash);
    optoutDelta.added.delete(hash);
  }
  for (const { hash } of optedOut) {
    hashes.add(hash);
    optoutDelta.added.add(hash);
    optoutDelta.removed.delete(hash);
  }
  const ids = new Set(optedOut.map((o) => o.id));
  for (const [slug, data] of countries) if (mentionsAny(data, ids)) purge(slug, data, ids);
}

/** Git commits and pushes run one at a time, whichever worker finishes first. */
let publishing: Promise<unknown> = Promise.resolve();
function serially<T>(task: () => Promise<T>): Promise<T> {
  const run = publishing.then(task);
  publishing = run.catch(() => undefined);
  return run;
}

/**
 * Commits and pushes the opt-out list first and the data second: a purge is never published while the hash
 * that explains it could still be lost. Earlier failed pushes are retried here too.
 */
async function publishAll(label: string): Promise<void> {
  writeHashes();
  if (!publish) return;
  await serially(async () => {
    await optoutStore.commit(`optout: ${label}`);
    await optoutStore.push(writeHashes, `optout: ${label}`);
    await dataStore.commit(`data: ${label}`);
    await dataStore.push(rewriteCountries, `data: ${label}`);
    if (Date.now() - lastDeploy > DEPLOY_EVERY_MS) await deploy();
  });
}
if (privacyChanged) await publishAll("remove opted-out people");

let stopped = false;

async function collectOne(client: GitHubGraphQL, { slug, reason }: (typeof queue)[number]): Promise<void> {
  const t0 = Date.now();
  const cost0 = client.usage.cost;
  const line = (result: string) =>
    report.push({ slug, result, minutes: ((Date.now() - t0) / 60_000).toFixed(1), cost: client.usage.cost - cost0 });
  try {
    const result = await collectCountry(client, {
      slug,
      presets,
      config,
      optout: { key: optoutKey, hashes },
      now: new Date(),
    });
    const previous = countries.get(slug);
    // A changed preset makes big changes expected: report them instead of holding the data back.
    const presetChanged = previous !== undefined && previous.presetChecksum !== result.data.presetChecksum;
    const reasons = breakerReasons(previous, result.data, config.circuit_breaker);
    applyOptouts(result.optedOut, result.optedIn);
    let outcome = `updated (${reason}), ${result.data.tabs.public.length} ranked`;
    if (reasons.length > 0 && !force && !presetChanged) {
      outcome = `held back: ${reasons.join("; ")}`;
    } else {
      if (reasons.length > 0) outcome += ` despite: ${reasons.join("; ")}`;
      countries.set(slug, result.data);
      writeCountry(result.data);
      updated++;
    }
    const s = result.stats;
    outcome += ` · candidates ${s.candidates}, other country ${s.otherCountry}, skipped ${s.skipped}, opt-outs +${s.optedOut}/-${s.optedIn}`;
    await publishAll(slug);
    line(outcome);
  } catch (e) {
    if (e instanceof AuthError) throw e;
    line(`failed: ${scrub(e instanceof Error ? e.message : String(e))}`);
    if (e instanceof OutOfTimeError) stopped = true;
    else failed++;
  }
  console.log(`${slug}: ${report.at(-1)?.result}`);
}

/** Workers take countries from the queue one by one until it is empty or time runs out. */
let next = 0;
async function worker(client: GitHubGraphQL): Promise<void> {
  for (let item = queue[next++]; item && !stopped; item = queue[next++]) {
    if (Date.now() > deadline - COUNTRY_RESERVE_MS)
      report.push({ slug: item.slug, result: "postponed: out of time", minutes: "", cost: 0 });
    else await collectOne(client, item);
  }
}
await Promise.all(clients.map(worker));

// Retry anything a failed push left behind, then make it one commit per run instead of one per country: the data
// branch stays small, and data-prev keeps the previous snapshot unless someone opted out in this run.
try {
  await publishAll("end of run");
  if (publish) await dataStore.squash(`data: snapshot ${new Date().toISOString()}`, "data-prev", !privacyChanged);
} catch (e) {
  failed++;
  report.push({
    slug: "(publish)",
    result: `failed: ${scrub(e instanceof Error ? e.message : String(e))}`,
    minutes: "",
    cost: 0,
  });
}
if (updated > 0 || privacyChanged) await deploy();

const sum = (pick: (c: GitHubGraphQL) => number) => clients.reduce((total, c) => total + pick(c), 0);
const summary = [
  `### Collector run: ${updated} updated, ${failed} failed, ${queue.length} due`,
  "",
  `${sum((c) => c.usage.requests)} requests, ${sum((c) => c.usage.cost)} points, ${((Date.now() - started) / 60_000).toFixed(0)} min`,
  "",
  "| Country | Result | Minutes | Points |",
  "| --- | --- | --- | --- |",
  ...report.map((r) => `| ${r.slug} | ${r.result.replaceAll("|", "/")} | ${r.minutes} | ${r.cost} |`),
].join("\n");
console.log(summary);
if (env["GITHUB_STEP_SUMMARY"]) appendFileSync(env["GITHUB_STEP_SUMMARY"], `${summary}\n`);

const nothingWorked = queue.length > 0 && updated === 0 && failed > 0;
if (env["HEALTHCHECK_URL"])
  await fetch(`${env["HEALTHCHECK_URL"]}${nothingWorked ? "/fail" : ""}`).catch(() => undefined);
if (nothingWorked) process.exitCode = 1;
