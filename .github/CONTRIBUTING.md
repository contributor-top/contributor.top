# Contributing

Thanks for helping! Every change starts with an issue and lands through a pull request.

## Add a country or city

The easiest way is an [Add a country](https://github.com/contributor-top/contributor.top/issues/new?template=add-country.yml)
issue. To edit presets yourself:

1. Copy `presets/_template.yml` to `presets/<slug>.yml` (lowercase letters, digits and `_`), or open the existing file.
2. Fill in `title`, `iso` (two-letter code in quotes, or `null`), `include` and `exclude`. Your editor autocompletes
   the fields from `site/src/schemas/preset.schema.json`.
3. Open a pull request with `Closes #<issue>`. CI validates the file and shows which locations conflict with other
   countries.

## Add a language or fix a translation

Open an [Add a language or fix a translation](https://github.com/contributor-top/contributor.top/issues/new?template=translation.yml)
issue, or edit the files yourself in `site/src/web/i18n/`:

1. `<code>.json` holds the site's texts (`en.json` is the source; copy it and translate the values). Keep every
   `{placeholder}`; a value that depends on a number is an object of plural forms (one, few, many, other…).
2. `docs/<code>/methodology.md` and `docs/<code>/privacy.md` are the two text pages; links to the site's pages get
   the language prefix (`/de/privacy/`).
3. `npm run test` checks keys, placeholders, plural forms and links. The site builds every page for each file it
   finds: no other change is needed.

## Code changes

```sh
cd site
npm ci
npm run check   # must pass before you open a PR
npm run fix     # formats code, YAML and Markdown
```

- The PR title becomes the commit message, so use [Conventional Commits](https://www.conventionalcommits.org/):
  `feat: …`, `fix: …`, `docs: …`, `chore: …`.
- Keep tests for collector logic; coverage below 90% fails CI.
- Never add personal data beyond what the schemas allow (`src/collector/country-data.ts`); CI checks this.

## Security

Please report vulnerabilities privately, see [SECURITY.md](SECURITY.md).
