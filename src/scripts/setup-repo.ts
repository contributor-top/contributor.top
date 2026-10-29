// Applies repository settings, the main-branch ruleset and GitHub Pages through the GitHub CLI.
// Dry run by default; pass --apply to change anything. Run once after the first commit's CI is green:
//   npm run setup-repo -- --repo contributors-top/contributors.top --apply
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

// The ruleset is stored in the repository so it is reviewed like code.
const ruleset = JSON.parse(readFileSync(".github/rulesets/main.json", "utf8")) as { name: string };
const existing = apply
  ? (JSON.parse(gh("GET", `/repos/${repo}/rulesets`) || "[]") as { id: number; name: string }[])
  : [];
const current = existing.find((r) => r.name === ruleset.name);
if (current) gh("PUT", `/repos/${repo}/rulesets/${current.id}`, ruleset);
else gh("POST", `/repos/${repo}/rulesets`, ruleset);

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
const DOMAIN = "contributors.top";
if (apply && attempt("GET", `/repos/${repo}/pages`) === undefined) {
  gh("POST", `/repos/${repo}/pages`, { build_type: "workflow" });
}
gh("PUT", `/repos/${repo}/pages`, { build_type: "workflow", cname: DOMAIN });
// GitHub issues the certificate only after DNS points to Pages; re-run later if this step is skipped.
attempt("PUT", `/repos/${repo}/pages`, { https_enforced: true });

// Only main may deploy.
gh("PUT", `/repos/${repo}/environments/github-pages`, {
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
});
const policies = apply
  ? (
      JSON.parse(gh("GET", `/repos/${repo}/environments/github-pages/deployment-branch-policies`)) as {
        branch_policies: { name: string }[];
      }
    ).branch_policies
  : [];
if (!policies.some((p) => p.name === "main")) {
  gh("POST", `/repos/${repo}/environments/github-pages/deployment-branch-policies`, { name: "main", type: "branch" });
}

console.log(apply ? "Done." : "Nothing changed. Re-run with --apply.");
