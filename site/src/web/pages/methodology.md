---
layout: ../layouts/Markdown.astro
title: Methodology
description: How contributor.top selects and ranks GitHub users.
---

# Methodology

## Who is considered

1. For every country we search GitHub for users whose profile **location** matches the country or one of its cities. The list of location strings for each country lives in [`presets/`](https://github.com/contributor-top/contributor.top/tree/main/presets) and is open to pull requests.
2. GitHub search cannot sort by contributions, so among everyone who matches we take the **1000 most-followed users** and rank only them. Each country page shows the actual follower count of the least-followed person considered.
3. Organizations and bots are excluded.
4. Everyone belongs to exactly **one** country: the first one their profile location mentions. If several countries are listed, only the first counts.

## What is counted

Contributions from the last 12 months, as GitHub counts them on profiles:

- **Public contributions** — commits, pull requests, issues and reviews visible to everyone.
- **All contributions** — public plus private. Private contributions are counted only for people who chose to show them on their profile; for everyone else this tab shows the same number as the public one.
- **Commits** — public commits only.

Ties are broken by follower count, then by login.

Under every name: `C` public commits, `PR` pull requests, `IS` issues, `RV` reviews and a lock for private contributions (hover for exact numbers). GitHub reports private activity as a single number that cannot be split or verified, so in the **All contributions** ranking a small lock next to the total marks people whose contributions are almost entirely (90% or more) private. They are not removed: many people work on closed-source code. The main ranking uses public contributions only.

Some accounts report an enormous number of commits and almost no other activity: no pull requests, issues or reviews. That is what a script committing to the same repository all day looks like, and so is an account whose commits nearly all go to one repository of its own that nobody else uses. People who commit straight to a widely used project of someone else, as maintainers of large community projects often do, are not counted as automated. Such accounts are marked with a small robot in country rankings and are left out of the world ranking and the world badges.

## Why am I not listed?

- Your profile location does not match any string in your country's preset. Location is free text: add your city or country, or open a pull request to the preset.
- You are not among the 1000 most-followed users in your country.
- Your contributions are private and not shown on your profile.
- You asked to be removed (see [Privacy and opt-out](/privacy/)).

## Data access

Every ranking is also available as JSON: [`/api/index.json`](/api/index.json) lists the countries, and `/api/<country>.json` (for example `/api/canada.json`) holds all three rankings with rank, login and contributions. The world ranking is in [`/api/world.json`](/api/world.json). The files are static and can be fetched from any site.

Use them for open-source research, statistics and community projects. Do not use them to contact people in bulk, for recruiting outreach or to resell the data. People who opted out are never included.

## Updates

Countries are updated one after another, the least recently updated first. Each country page shows when it was last updated.

Inspired by [committers.top](https://committers.top).
