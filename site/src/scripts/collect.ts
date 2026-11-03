// The collector run: refreshes the countries that are due, within the time budget, and publishes them.
//
// Environment:
//   COLLECTOR_APP_ID, COLLECTOR_APP_KEY  GitHub App credentials (CI); otherwise GITHUB_TOKEN or `gh auth token`
//   OPTOUT_KEY        HMAC key of the opt-out list (at least 32 characters, required)
//   COUNTRIES         comma-separated slugs to refresh now instead of the queue
//   FORCE=true        publish even when the circuit breaker objects
//   PUBLISH=true      commit and push the data and optout branches, then trigger a deploy, and the next run
//                     while countries are due that this run did not try (CI only)
//   DATA_DIR, OPTOUT_DIR  working copies (default ../.data and ../.optout)
//   MAX_MINUTES       override freshness.max_run_minutes
//   HEALTHCHECK_URL   pinged at the end (/fail when nothing could be collected)
// Logs carry slugs and counts only: no logins, IDs or locations.
import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { appBotIdentity, installationToken } from "../collector/app-token.ts";
import { breakerReasons } from "../collector/breaker.ts";
import { loadConfig } from "../collector/config.ts";
import { collectCountry } from "../collector/country.ts";
import type { CountryData } from "../collector/country-data.ts";
import { loadCountries } from "../collector/data-dir.ts";
import { olderThan } from "../collector/freshness.ts";
import { AuthError, GitHubGraphQL, OutOfTimeError } from "../collector/github.ts";
import { optoutHash } from "../collector/optout.ts";
import {
  decryptHashes,
  encryptHashes,
  LEGACY_FILE,
  LIST_FILE,
  mentionsAny,
  parseHashes,
  purgeCountry,
} from "../collector/optout-list.ts";
import { loadPresets } from "../collector/preset.ts";
import { dueCountries } from "../collector/queue.ts";
import { scrub } from "../collector/scrub.ts";
import { optedOutByStatus, publishedPeople } from "../collector/sweep.ts";
import { fitsBefore, parseTimings, reserveMs, serializeTimings, shouldContinue } from "../collector/timing.ts";
import { BranchStore, type Identity } from "./branch-store.ts";

const env = process.env;
const config = loadConfig();
const repo = config.site.repo;
const publish = env["PUBLISH"] === "true";
const force = env["FORCE"] === "true";
const started = Date.now();
const deadline = started + Number(env["MAX_MINUTES"] || config.freshness.max_run_minutes) * 60_000;
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

const listFile = join(optoutStore.dir, LIST_FILE);
const legacyFile = join(optoutStore.dir, LEGACY_FILE);
/** Read without a separate existence check (no window between check and use); missing means absent. */
function readOptional(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
/**
 * The encrypted list, plus the plain list it replaced while that still exists. Neither one means the first run;
 * a list that cannot be read stops the run instead of counting as empty.
 */
function readHashes(): Set<string> {
  const hashes = new Set<string>();
  const list = readOptional(listFile);
  if (list !== null) for (const hash of decryptHashes(list, optoutKey)) hashes.add(hash);
  const legacy = readOptional(legacyFile);
  if (legacy !== null) for (const hash of parseHashes(legacy)) hashes.add(hash);
  return hashes;
}
const hashes = readHashes();
/** What this run changed in the opt-out list; applied on top of the file, so hashes added by others survive. */
const optoutDelta = { added: new Set<string>(), removed: new Set<string>() };
function writeHashes(): void {
  const merged = readHashes();
  for (const hash of optoutDelta.added) merged.add(hash);
  for (const hash of optoutDelta.removed) merged.delete(hash);
  for (const hash of merged) hashes.add(hash);
  // A fresh nonce every time: the file changes on every write, whether anyone opted out or not.
  writeFileSync(listFile, encryptHashes(merged, optoutKey));
  rmSync(legacyFile, { force: true });
}

const presets = loadPresets("../presets", config.reserved_slugs);
const countries = new Map(loadCountries(dataStore.dir).map((c) => [c.slug, c]));
/** Countries this run wrote: after a rejected push they are written again on top of GitHub's version. */
const touched = new Set<string>();
function writeCountry(data: CountryData): void {
  touched.add(data.slug);
  writeFileSync(join(dataStore.dir, "countries", `${data.slug}.json`), `${JSON.stringify(data)}\n`);
}

/** Minutes each country's last collection took: a country is started only if it can still finish. */
const timingsFile = join(dataStore.dir, "timings.json");
const timings = parseTimings(
  (() => {
    try {
      return readFileSync(timingsFile, "utf8");
    } catch {
      return null; // missing: no country measured yet
    }
  })(),
);
const writeTimings = () => writeFileSync(timingsFile, serializeTimings(timings));

const rewriteCountries = () => {
  for (const slug of touched) writeCountry(countries.get(slug) as CountryData);
  writeTimings();
};

/** Someone left the data in this run, so the previous snapshot must not stay public as data-prev. */
let privacyChanged = false;
function purge(slug: string, data: CountryData, ids: ReadonlySet<number>): void {
  const purged = purgeCountry(data, ids);
  countries.set(slug, purged);
  writeCountry(purged);
  privacyChanged = true;
}
// Everyone on the opt-out list leaves the published data now, however they were added (status or by hand).
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

type Workflow = "deploy.yml" | "update.yml";

/** One call to a workflow's Actions API; a failure is logged, never fatal (the next run or the cron tries again). */
async function workflowApi(workflow: Workflow, action: "dispatches" | "enable"): Promise<void> {
  if (!publish || !appToken) return;
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/${action}`, {
      method: action === "dispatches" ? "POST" : "PUT",
      headers: {
        Authorization: `Bearer ${await appToken()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(action === "dispatches" ? { body: JSON.stringify({ ref: "main" }) } : {}),
    });
    if (response.status !== 204) console.log(`${workflow} ${action} returned ${response.status}`);
  } catch (e) {
    console.log(`${workflow} ${action} failed: ${scrub(e instanceof Error ? e.message : String(e))}`);
  }
}

/** Starts a workflow on main. */
const dispatch = (workflow: Workflow) => workflowApi(workflow, "dispatches");

async function deploy(): Promise<void> {
  lastDeploy = Date.now();
  await dispatch("deploy.yml");
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
// Neutral labels: commit messages must not say that someone left.
if (privacyChanged) await publishAll("start of run");

// A country's collection reads its people's statuses; one that keeps failing never would. So the people still
// shown in overdue countries are checked here, by status only, at the start of every run.
{
  const listed = [...countries.values()].filter((c) => presets.has(c.slug));
  const overdue = olderThan(listed, new Date(), config.freshness.target_hours).map(
    (s) => countries.get(s.slug) as CountryData,
  );
  if (overdue.length > 0) {
    const client = clients[0] as GitHubGraphQL;
    const t0 = Date.now();
    const cost0 = client.usage.cost;
    const people = publishedPeople(overdue, (id) => hashes.has(optoutHash(id, optoutKey)));
    let result = `checked ${people.length} people shown in ${overdue.length} overdue countries`;
    try {
      const { optout_phrase: optout, optin_phrase: optin } = config.privacy;
      const ids = await optedOutByStatus(client, people, { optout, optin });
      if (ids.length > 0) {
        applyOptouts(
          ids.map((id) => ({ id, hash: optoutHash(id, optoutKey) })),
          [],
        );
        await publishAll("status check");
      }
    } catch (e) {
      if (e instanceof AuthError) throw e;
      result = `failed: ${scrub(e instanceof Error ? e.message : String(e))}`;
    }
    // Counts of people checked only: how many opted out stays out of the public log.
    report.push({
      slug: "(statuses)",
      result,
      minutes: ((Date.now() - t0) / 60_000).toFixed(1),
      cost: client.usage.cost - cost0,
    });
    console.log(`(statuses): ${result}`);
  }
}

let stopped = false;
/** Countries this run is done with, collected or not; the rest of the queue is left for the next run. */
const finished = new Set<string>();

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
    timings.set(slug, (Date.now() - t0) / 60_000);
    writeTimings();
    finished.add(slug);
    const s = result.stats;
    // No opt-out counts: next to the data's history they would tell who left (#52).
    outcome += ` · candidates ${s.candidates}, other country ${s.otherCountry}, skipped ${s.skipped}`;
    await publishAll(slug);
    line(outcome);
  } catch (e) {
    if (e instanceof AuthError) throw e;
    line(`failed: ${scrub(e instanceof Error ? e.message : String(e))}`);
    if (e instanceof OutOfTimeError) stopped = true;
    else {
      failed++;
      finished.add(slug);
    }
  }
  console.log(`${slug}: ${report.at(-1)?.result}`);
}

/**
 * Workers take countries from the queue one by one until it is empty or time runs out. A country that would not
 * finish in time is postponed, and the worker goes on to the next one, which may be smaller and still fit.
 */
let next = 0;
async function worker(client: GitHubGraphQL): Promise<void> {
  for (let item = queue[next++]; item && !stopped; item = queue[next++]) {
    if (!fitsBefore(Date.now(), deadline, reserveMs(item.slug, timings)))
      report.push({ slug: item.slug, result: "postponed: out of time", minutes: "", cost: 0 });
    else await collectOne(client, item);
  }
}
await Promise.all(clients.map(worker));

// Retry anything a failed push left behind, then make it one commit per run instead of one per country: the data
// branch stays small, and data-prev keeps the previous snapshot unless someone opted out in this run.
try {
  await publishAll("end of run");
  if (publish) {
    await dataStore.squash(`data: snapshot ${new Date().toISOString()}`, "data-prev", !privacyChanged);
    // The opt-out branch keeps no history either: one commit of the encrypted list.
    await optoutStore.squash(`optout: snapshot ${new Date().toISOString()}`, null, false);
  }
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
// GitHub drops many scheduled runs, so a run starts the next one itself while countries are due that it did not try:
// the ones it had no time for and the ones that became due while it ran. The concurrency group queues the next run
// behind this one; the cron only starts a new cycle once everything was fresh.
const left = dueCountries({
  presets,
  existing: countries,
  now: new Date(),
  minRefreshHours: config.freshness.min_refresh_hours,
}).filter((item) => !finished.has(item.slug)).length;
const continuing = publish && shouldContinue({ left, updated });
if (continuing) await dispatch("update.yml");
// GitHub disables a public repository's scheduled workflows after 60 days without activity. Once every country is
// fresh, only the hourly cron starts the next cycle, so a disabled schedule would stop collection silently (and the
// stale-data alert, which runs after collection, with it). Enabling it again after every run keeps it alive.
await workflowApi("update.yml", "enable");

const sum = (pick: (c: GitHubGraphQL) => number) => clients.reduce((total, c) => total + pick(c), 0);
const summary = [
  `### Collector run: ${updated} updated, ${failed} failed, ${queue.length} due`,
  "",
  `${sum((c) => c.usage.requests)} requests, ${sum((c) => c.usage.cost)} points, ${((Date.now() - started) / 60_000).toFixed(0)} min` +
    (left > 0 ? `, ${left} left for the next run${continuing ? " (started)" : ""}` : ""),
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
