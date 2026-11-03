// Runs after `astro build` (Astro empties its output directory): writes shields.io endpoint JSON to <out>/u/.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildBadges } from "../collector/badges.ts";
import { loadConfig } from "../collector/config.ts";
import { loadCountries, presetsDir } from "../collector/data-dir.ts";
import { loadPresets } from "../collector/preset.ts";

const config = loadConfig();
// The same countries the site lists: data left over from a removed preset has no page to link to.
const presets = loadPresets(presetsDir(), config.reserved_slugs);
const countries = loadCountries().filter((c) => presets.has(c.slug));
const out = join(process.env["OUT_DIR"] ?? "dist", "u");
mkdirSync(out, { recursive: true });
const badges = buildBadges(countries, config.ranking.world_top_n);
for (const [name, badge] of badges) writeFileSync(join(out, `${name}.json`), JSON.stringify(badge));
console.log(`${badges.size} badges written to ${out}`);
