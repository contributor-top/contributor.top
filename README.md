# contributors.top

The most active GitHub users by country, ranked by public contributions over the last 12 months.

**Site:** https://contributors.top · **How it works:** [methodology](https://contributors.top/methodology/) ·
**Privacy and opt-out:** [privacy](https://contributors.top/privacy/)

Inspired by [committers.top](https://committers.top). Rewritten from scratch with fresh data every 48 hours, a
transparent methodology and a simple way to opt out.

## Add your country or city

Open an [Add a country](https://github.com/contributors-top/contributors.top/issues/new?template=add-country.yml)
issue, or edit `presets/<country>.yml` directly — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Requires Node.js 22 (see `.nvmrc`).

```sh
npm ci
npm run dev      # site on http://localhost:4321 with fictional fixture data
npm run check    # everything CI checks: lint, types, tests, validation, build, privacy
```

| Path                | What                                                          |
| ------------------- | ------------------------------------------------------------- |
| `presets/*.yml`     | Location strings per country (edit these)                     |
| `config.yml`        | Ranking size, refresh cycle, thresholds                       |
| `collector/`        | Data collection and ranking logic                             |
| `src/`              | The Astro site                                                |
| `fixtures/`         | Fictional data (Atlantis, El Dorado) for tests and local runs |
| `.github/rulesets/` | Branch protection, applied with `scripts/setup-repo.ts`       |

## License

[MIT](LICENSE). Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
