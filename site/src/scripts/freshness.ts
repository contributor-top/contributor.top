// After a collector run: writes the stale-data alert for update.yml, which opens, updates or closes the issue.
//
// Environment:
//   DATA_DIR        the data branch's working copy
//   STALE_REPORT    file to write the issue body to (only when something is stale)
//   GITHUB_OUTPUT   receives stale=<count>
import { appendFileSync, writeFileSync } from "node:fs";
import { loadConfig } from "../collector/config.ts";
import { listedCountries } from "../collector/data-dir.ts";
import { staleCountries, staleReport } from "../collector/freshness.ts";

const config = loadConfig();
// Only countries the site lists; data left over from a removed preset is never refreshed and must not alert.
const { countries } = listedCountries(config.reserved_slugs);
const stale = staleCountries(countries, new Date(), config.freshness.stale_days);

console.log(`${stale.length} of ${countries.length} countries are older than ${config.freshness.stale_days} days`);
if (stale.length > 0 && process.env["STALE_REPORT"]) {
  writeFileSync(process.env["STALE_REPORT"], staleReport(stale, config.freshness.stale_days));
}
if (process.env["GITHUB_OUTPUT"]) appendFileSync(process.env["GITHUB_OUTPUT"], `stale=${stale.length}\n`);
