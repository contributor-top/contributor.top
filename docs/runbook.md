# Runbook

Operational notes for maintainers. Steps that depend on workflows not built yet are marked _(planned)_.

## First setup

1. Create the organization and the public repository, push the first commit.
2. When CI on `main` is green: in `site/`, `npm run setup-repo` (dry run), then `npm run setup-repo -- --apply`.
3. Organization settings: require 2FA, base permission `read`, allow GitHub-owned actions plus the allowlist in the
   project plan, default `GITHUB_TOKEN` read-only, approval for all outside contributors.

## Collector setup

1. In `site/`: `npm run setup-collector`. It sets `OPTOUT_KEY` (and writes one backup copy: move it to a password
   manager, delete the file), then prints a local URL: open it, press **Create on GitHub**. The App ID and private key
   go straight into the `collector` environment.
2. Install the App on this repository only (the script prints the link).
3. Optional: create a healthchecks.io check (period 1 day) and store its ping URL as the `HEALTHCHECK_URL` secret of
   the `collector` environment.
4. Set the repository variable `COLLECT_ENABLED` to `true`. Any other value pauses collection (kill switch).
5. Run **update** manually with one small country (for example `estonia`) and check the data branch and the site.

A local run without publishing: `OPTOUT_KEY=<any 32+ characters> COUNTRIES=estonia npm run collect` (uses
`gh auth token`, writes `../.data/`).

## The collector stopped

- The run summary (Actions → update) lists every country with its result; failures never show logins.
- healthchecks.io emails when no successful run happened for 24 hours.
- Scheduled workflows in public repositories are disabled after 60 days without activity: re-enable `update.yml` in
  the Actions tab.

## Bad data was published _(planned)_

Restore the previous data with the `data-prev` branch, then run the collector for the affected country with `force`.

## Manual removal request

1. Check that the request comes from the account owner.
2. `npm run optout:hash -- <login>` locally (needs the backup of `OPTOUT_KEY`) _(planned)_.
3. Run `optout-manual` with the hash only — never the login or ID: workflow inputs are public.

## Spam wave

Turn on interaction limits for the repository (Settings → Moderation) and block accounts at the organization level.
