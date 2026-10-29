# contributors.top

The most active GitHub users by country, ranked by public contributions over the last 12 months.

**Site:** https://contributors.top · **How it works:** [methodology](https://contributors.top/methodology/) ·
**Privacy and opt-out:** [privacy](https://contributors.top/privacy/)

Inspired by [committers.top](https://committers.top). Rewritten from scratch with fresh data every 48 hours, a
transparent methodology and a simple way to opt out.

## Add your country or city

Open an [Add a country](https://github.com/contributors-top/contributors.top/issues/new?template=add-country.yml)
issue, or edit `presets/<country>.yml` directly — see [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Development

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
| `site/src/public/`    | Static files served as is (icons, robots.txt)               |
| `site/src/scripts/`   | Build, validation and repository setup scripts              |
| `site/src/schemas/`   | Generated JSON Schemas for editor autocompletion            |
| `site/test/`          | Tests; `test/fixtures/` holds fictional data for local runs |
| `docs/`               | Maintainer runbook                                          |
| `.github/`            | CI, issue forms, rulesets, contributing and security policy |
| `.config/`            | Git hooks (lefthook)                                        |

## License

[MIT](LICENSE). Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
