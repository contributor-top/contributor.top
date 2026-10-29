// Runs after `astro build` (Astro empties its output directory): writes shields.io endpoint JSON to <out>/u/.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildBadges } from "../collector/badges.ts";
import { loadCountries } from "../collector/data-dir.ts";

const out = join(process.env["OUT_DIR"] ?? "dist", "u");
mkdirSync(out, { recursive: true });
const badges = buildBadges(loadCountries());
for (const [name, badge] of badges) writeFileSync(join(out, `${name}.json`), JSON.stringify(badge));
console.log(`${badges.size} badges written to ${out}`);
