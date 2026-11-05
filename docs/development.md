# Development

Requires Node.js 22.23.4 or newer (see `site/.nvmrc`); earlier releases are vulnerable to CVE-2026-111497
(Node2Shell).

```sh
cd site
npm ci
npm run dev      # site on http://localhost:4321 with fictional fixture data
npm run check    # everything CI checks: lint, types, tests, validation, build, privacy
```

| Path                  | What                                                        |
| --------------------- | ----------------------------------------------------------- |
| `presets/*.yml`       | Location strings per country (edit these)                   |
| `config.yml`          | Ranking size, refresh cycle, thresholds                     |
| `site/`               | The Node project: package.json, tool configs, sources       |
| `site/src/collector/` | Data collection and ranking logic                           |
| `site/src/web/`       | The Astro site (pages, components, styles)                  |
| `site/src/web/i18n/`  | Translations: texts per language and the two text pages     |
| `site/src/public/`    | Static files served as is (icons, robots.txt)               |
| `site/src/scripts/`   | Build, validation and repository setup scripts              |
| `site/src/schemas/`   | Generated JSON Schemas for editor autocompletion            |
| `site/test/`          | Tests; `test/fixtures/` holds fictional data for local runs |
| `docs/`               | This guide and the maintainer runbook                       |
| `.github/`            | CI, issue forms, rulesets, contributing and security policy |
| `.config/`            | Git hooks (lefthook)                                        |
