---
title: Methodology
description: How contributor.top selects and ranks GitHub users.
---

# Methodology

## Who is considered

1. For every country we search GitHub for users whose profile **location** matches the country or one of its cities. The list of location strings for each country lives in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) and is open to pull requests.
2. GitHub search cannot sort by contributions, so among everyone who matches we take the **{{consider}} most-followed users** and rank only them. Each country page shows the actual follower count of the least-followed person considered.
3. Organizations and bots are excluded.
4. Everyone belongs to exactly **one** country: the first one their profile location mentions. If several countries are listed, only the first counts.

## What is counted

Contributions from the last 12 months, as GitHub counts them on profiles:

- **Public contributions** — commits, pull requests, issues and reviews visible to everyone.
- **All contributions** — public plus private. Private contributions are counted only for people who chose to show them on their profile; for everyone else this tab shows the same number as the public one.
- **Commits** — public commits only.

Ties are broken by follower count, then by login.

Under every name: `C` public commits, `PR` pull requests, `IS` issues, `RV` reviews and a lock for private contributions (hover for exact numbers).

## Marks and exclusions

A few rules, the same for everyone, keep numbers that cannot be checked, or that a script produced, from deciding a ranking. Every mark in a ranking shows on hover the rule behind it and the numbers it was applied to.

| Rule                  | When                                                                                                                                                                 | What happens                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Mostly private        | {{private_flag}}% or more of the contributions are private                                                                                                           | A lock next to the total in **All contributions**                               |
| Almost nothing public | Public contributions are under {{min_public}}% of the total                                                                                                          | Left out of **All contributions**, still in the other rankings                  |
| Commit farm           | {{min_commits}} commits or more, at least {{ratio}} times as many as pull requests, issues and reviews together                                                      | A robot in country rankings; left out of the world ranking and the world badges |
| One quiet repository  | {{min_commits}} commits or more, {{quiet_share}}% of them or more in one repository of their own with fewer than {{quiet_stars}} stars                               | The same as a commit farm                                                       |
| Exception             | {{popular_share}}% of the commits or more go to someone else's repository with {{popular_stars}} stars or more, or to any repository of an organization that has one | Never marked as automated                                                       |

GitHub reports private activity as a single number that cannot be split or verified, so it counts only where public work backs it up; a lock alone removes no one, as many people work on closed-source code. People who commit straight to a widely used project, as maintainers of large community projects and Linux distributions often do, are not counted as automated: only the project can let them commit there.

## Checking the rankings

The rankings follow only these rules and the order above; no one is moved by hand. The thresholds come from [`config.yml`](https://github.com/contributor-top/contributor.top/blob/main/config.yml), and its only manual list, `denylist_ids`, changes only by a public pull request. The numbers collected for every country are in the [`data` branch](https://github.com/contributor-top/contributor.top/tree/data) of the repository, so any ranking can be recomputed and checked.

## Why am I not listed?

- Your profile location does not match any string in your country's preset. Location is free text: add your city or country, or open a pull request to the preset.
- You are not among the {{consider}} most-followed users in your country.
- Almost all your contributions are private (under {{min_public}}% public): you are left out of **All contributions** only.
- Your contributions are private and not shown on your profile.
- You asked to be removed (see [Privacy and opt-out](/privacy/)).

## Data access

Every ranking is also available as JSON: [`/api/index.json`](/api/index.json) lists the countries, and `/api/<country>.json` (for example `/api/canada.json`) holds all three rankings with rank, login and contributions. The world ranking is in [`/api/world.json`](/api/world.json). The files are static and can be fetched from any site.

Use them for open-source research, statistics and community projects. Do not use them to contact people in bulk, for recruiting outreach or to resell the data. People who opted out are never included.

## Updates

Countries are updated one after another, the least recently updated first. Each country page shows when it was last updated.

Inspired by [committers.top](https://committers.top).
