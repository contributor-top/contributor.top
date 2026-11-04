// Runs after `astro build` (Astro empties its output directory): writes shields.io endpoint JSON to <out>/u/.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildBadges } from "../collector/badges.ts";
import { loadConfig } from "../collector/config.ts";
import { listedCountries } from "../collector/data-dir.ts";

const config = loadConfig();
// The same countries the site lists: data left over from a removed preset has no page to link to.
const { countries } = listedCountries(config.reserved_slugs);
const out = join(process.env["OUT_DIR"] ?? "dist", "u");
mkdirSync(out, { recursive: true });
// The same world ranking as the /world/ page: commit farms are left out of both.
const badges = buildBadges(countries, config.ranking.world_top_n, config.ranking.automated);
for (const [name, badge] of badges) writeFileSync(join(out, `${name}.json`), JSON.stringify(badge));
console.log(`${badges.size} badges written to ${out}`);
