// Applies repository settings, rulesets, environments and GitHub Pages through the GitHub CLI.
// Dry run by default; pass --apply to change anything. Run once after the first commit's CI is green,
// and again after the collector App exists (its ruleset needs the App ID):
//   npm run setup-repo -- --repo contributor-top/contributor.top --apply
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../collector/config.ts";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const repoArg = args[args.indexOf("--repo") + 1];
const repo = args.includes("--repo") && repoArg ? repoArg : loadConfig().site.repo;
if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) throw new Error(`invalid repository: ${repo}`);

/** Calls `gh api` with a JSON body on stdin; in a dry run only prints what would be sent. */
function gh(method: string, path: string, body?: unknown): string {
  console.log(`${apply ? "" : "[dry run] "}${method} ${path}`);
  if (!apply) return "";
  const input = body === undefined ? undefined : JSON.stringify(body);
  return execFileSync("gh", ["api", "--method", method, path, ...(input ? ["--input", "-"] : [])], {
    input,
    encoding: "utf8",
  });
}

// Squash only, PR title + body as the commit message; branches cleaned up after merge.
gh("PATCH", `/repos/${repo}`, {
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  allow_auto_merge: true,
  delete_branch_on_merge: true,
  squash_merge_commit_title: "PR_TITLE",
  squash_merge_commit_message: "PR_BODY",
  has_wiki: false,
  has_projects: false,
  security_and_analysis: {
    secret_scanning: { status: "enabled" },
    secret_scanning_push_protection: { status: "enabled" },
  },
});
gh("PUT", `/repos/${repo}/private-vulnerability-reporting`);
gh("PUT", `/repos/${repo}/vulnerability-alerts`);

// Rulesets are stored in the repository so they are reviewed like code. A bypass actor written as
// "COLLECTOR_APP_ID" is the collector App, whose ID lives in the collector environment.
type Ruleset = { name: string; bypass_actors: { actor_id: number | string }[] };
const existing = apply
  ? (JSON.parse(gh("GET", `/repos/${repo}/rulesets`) || "[]") as { id: number; name: string }[])
  : [];
for (const file of readdirSync("../.github/rulesets").filter((f) => f.endsWith(".json"))) {
  const ruleset = JSON.parse(readFileSync(join("../.github/rulesets", file), "utf8")) as Ruleset;
  for (const actor of ruleset.bypass_actors) {
    if (actor.actor_id !== "COLLECTOR_APP_ID") continue;
    actor.actor_id = apply
      ? Number(
          execFileSync("gh", ["variable", "get", "COLLECTOR_APP_ID", "--env", "collector", "--repo", repo], {
            encoding: "utf8",
          }),
        )
      : 0;
  }
  const current = existing.find((r) => r.name === ruleset.name);
  if (current) gh("PUT", `/repos/${repo}/rulesets/${current.id}`, ruleset);
  else gh("POST", `/repos/${repo}/rulesets`, ruleset);
}

/** gh() for calls that legitimately fail on the first run (resource missing, certificate not issued yet). */
function attempt(method: string, path: string, body?: unknown): string | undefined {
  try {
    return gh(method, path, body);
  } catch {
    console.log(`  (not done yet: ${method} ${path})`);
    return undefined;
  }
}

// GitHub Pages is published by .github/workflows/deploy.yml. The domain (same as `site` in astro.config.mjs)
// is verified at the organization level, so no other account can claim it.
const DOMAIN = "contributor.top";
if (apply && attempt("GET", `/repos/${repo}/pages`) === undefined) {
  gh("POST", `/repos/${repo}/pages`, { build_type: "workflow" });
}
gh("PUT", `/repos/${repo}/pages`, { build_type: "workflow", cname: DOMAIN });
// GitHub issues the certificate only after DNS points to Pages; re-run later if this step is skipped.
attempt("PUT", `/repos/${repo}/pages`, { https_enforced: true });

/** Only main may use the environment: a workflow from any other branch never sees its secrets. */
function onlyFromMain(environment: string): void {
  gh("PUT", `/repos/${repo}/environments/${environment}`, {
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  });
  const path = `/repos/${repo}/environments/${environment}/deployment-branch-policies`;
  const policies = apply
    ? (JSON.parse(gh("GET", path)) as { branch_policies: { name: string }[] }).branch_policies
    : [];
  if (!policies.some((p) => p.name === "main")) gh("POST", path, { name: "main", type: "branch" });
}
onlyFromMain("github-pages");
// The collector: holds COLLECTOR_APP_KEY, OPTOUT_KEY and HEALTHCHECK_URL.
onlyFromMain("collector");

// Workflows from fork pull requests run only after a maintainer approves them, for every outside contributor,
// not only first-time ones. They never get secrets or a write token either way.
gh("PUT", `/repos/${repo}/actions/permissions/fork-pr-contributor-approval`, {
  approval_policy: "all_external_contributors",
});

console.log(apply ? "Done." : "Nothing changed. Re-run with --apply.");
