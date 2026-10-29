// Validates config.yml, presets/*.yml and fixtures/presets/*.yml; prints file:line errors and exits non-zero.
import { loadConfig } from "../collector/config.ts";
import { loadPresets } from "../collector/preset.ts";
import { buildQuery, fitsSearchLimits } from "../collector/query.ts";
import { ConfigError } from "../collector/yaml.ts";

try {
  const config = loadConfig();
  for (const dir of ["presets", "fixtures/presets"]) {
    const presets = loadPresets(dir, config.reserved_slugs);
    const tooLong = [...presets].filter(([, p]) => !fitsSearchLimits(buildQuery(p))).map(([slug]) => slug);
    if (tooLong.length > 0) {
      throw new ConfigError(
        dir,
        tooLong.map((s) => `${s}: search query exceeds GitHub limits`),
      );
    }
    console.log(`${dir}: ${presets.size} presets ok`);
  }
  console.log("config.yml ok");
} catch (e) {
  console.error(e instanceof ConfigError ? e.message : e);
  process.exit(1);
}
