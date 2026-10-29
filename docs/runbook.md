# Runbook

Operational notes for maintainers. Steps that depend on workflows not built yet are marked _(planned)_.

## First setup

1. Create the organization and the public repository, push the first commit.
2. When CI on `main` is green: `npx tsx src/scripts/setup-repo.ts` (dry run), then add `--apply`.
3. Organization settings: require 2FA, base permission `read`, allow GitHub-owned actions plus the allowlist in the
   project plan, default `GITHUB_TOKEN` read-only, approval for first-time contributors.

## The collector stopped _(planned)_

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
