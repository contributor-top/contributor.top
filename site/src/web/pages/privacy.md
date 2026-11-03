---
layout: ../layouts/Markdown.astro
title: Privacy and opt-out
description: What data contributors.top uses and how to be removed.
---

# Privacy and opt-out

## What we use

Only public data from GitHub profiles: your numeric account ID, login, follower count and contribution counts for the last 12 months. We do not store your name, email, bio, company, status or the exact text of your location. Data is not sold and not shared with recruiters or job boards.

## Remove yourself

Set your GitHub status to a message containing `contributors.top opt-out`, visible to everyone, with "Clear after: Don't clear". You are removed from all rankings and badges the next time your country is updated (within about two days); if your country's update keeps failing, the status is still checked at the start of every collector run. After that you can remove the status; the opt-out stays.

There is no form or issue to fill in on purpose: a public request would tie your login to the removal forever. The status needs no contact with us and is read only from your own profile, so nobody can remove or add anyone else.

We keep only a keyed hash of your account ID so that you are not added back, in an encrypted list that is re-encrypted on every run: neither who nor how many people opted out, nor when, can be read from it. To return, set a status containing `contributors.top opt-in`.

## What we cannot control

Copies made before removal: old commits of the public repository, web archives, forks and search engine caches. Anyone comparing the rankings over time can see that you are no longer listed, as with anyone who moves or drops out of the top. Avatars are loaded from GitHub's servers, and each page asks GitHub's API for the repository's star count, so GitHub sees the visitor's IP address. The site uses no analytics and no cookies.

## Contact

Questions about this page: [open an issue](https://github.com/contributors-top/contributors.top/issues).
