# Runbook

Operational notes for maintainers. Steps that depend on workflows not built yet are marked _(planned)_.

## First setup

1. Create the organization and the public repository, push the first commit.
2. When CI on `main` is green: in `site/`, `npm run setup-repo` (dry run), then `npm run setup-repo -- --apply`.
3. Organization settings: require 2FA, base permission `read`, allow GitHub-owned actions plus the allowlist in the
   project plan, default `GITHUB_TOKEN` read-only, approval for all outside contributors.

## Collector setup

The `collector` environment (usable from `main` only) holds:

| Name                | Kind     | What                                                                    |
| ------------------- | -------- | ----------------------------------------------------------------------- |
| `COLLECTOR_APP_ID`  | variable | ID of the organization's `contributors-top-collector` GitHub App        |
| `COLLECTOR_APP_KEY` | secret   | the App's private key (permissions: contents and actions write)         |
| `OPTOUT_KEY`        | secret   | HMAC key of the opt-out list; a backup lives outside GitHub, never lose |
| `HEALTHCHECK_URL`   | secret   | optional healthchecks.io ping URL (check period: 1 day)                 |

The App is installed on this repository only. The `collector-branches` ruleset lets only the App create, update or
delete the `data` and `optout` branches; `npm run setup-repo -- --apply` fills in the App ID from the environment, so
run it again after creating or recreating the App. Collection runs while the repository variable `COLLECT_ENABLED` is
`true`; any other value pauses it (kill switch). To test, run **update** manually with one small country (for example
`estonia`).

Rotating the App key: App settings → Private keys → Generate, then
`gh secret set COLLECTOR_APP_KEY --env collector < key.pem`, delete the old key and the local file.

A local run without publishing: `OPTOUT_KEY=<any 32+ characters> COUNTRIES=estonia npm run collect` (uses
`gh auth token`, writes `../.data/`).

## The collector stopped

- The run summary (Actions → update) lists every country with its result; failures never show logins.
- healthchecks.io emails when no successful run happened for 24 hours.
- Scheduled workflows in public repositories are disabled after 60 days without activity: re-enable `update.yml` in
  the Actions tab.

## A deploy hangs in `syncing_files`

The **deploy** job's log repeats `Status: syncing_files` (or `unknown`) for ten minutes, then warns that it cancels the
deployment. Usually a deployment takes 10 seconds to 2 minutes. The site holds about 340,000 files (mostly badges in
`u/`), and GitHub Pages sometimes does not finish syncing them; githubstatus.com may show no incident.

- A Pages deployment is named after a commit (Pages refuses other names), and a name that hung once keeps hanging; a
  name that succeeded may be skipped while the job reports success (seen 2026-11-09 and 2026-11-10). So a push deploys
  under its `main` commit, and the collector's deploys under the `data` snapshot it has just pushed; the log's first
  line lists the names.
- Do not rerun a failed job or dispatch **deploy** by hand: both reuse a name. The collector's next deploy brings a new
  snapshot, and a merged pull request a new commit; either deploys. The site keeps serving the last successful
  deployment meanwhile.

## Bad data was published _(planned)_

Restore the previous data with the `data-prev` branch, then run the collector for the affected country with `force`.

## Manual removal request

1. Check that the request comes from the account owner.
2. `npm run optout:hash -- <login>` locally (needs the backup of `OPTOUT_KEY`) _(planned)_. The list on the `optout`
   branch (`list.enc`) is encrypted with a key derived from `OPTOUT_KEY`: without the key backup it cannot be read or
   edited, and the collector stops rather than start from an empty list.
3. Run `optout-manual` with the hash only — never the login or ID: workflow inputs are public.

## Spam wave

Turn on interaction limits for the repository (Settings → Moderation) and block accounts at the organization level.
