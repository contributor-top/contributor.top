import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type CountryData, countryDataSchema } from "./country-data.ts";

/** Country data lives in the `data` branch in production; CI and local builds use fixtures. */
export const dataDir = (): string => process.env["DATA_DIR"] ?? "test/fixtures/data";

/**
 * Real presets go with real data. Without DATA_DIR the site is built from fixtures,
 * which use fictional countries so that no real person or place appears in test pages.
 */
export const presetsDir = (): string =>
  process.env["PRESETS_DIR"] ?? (process.env["DATA_DIR"] ? "../presets" : "test/fixtures/presets");

export function loadCountries(dir = dataDir()): CountryData[] {
  const countriesDir = join(dir, "countries");
  if (!existsSync(countriesDir)) return [];
  return readdirSync(countriesDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const file = join(countriesDir, f);
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(file, "utf8"));
      } catch (e) {
        throw new Error(`${file}: invalid JSON (${e instanceof Error ? e.message : String(e)})`);
      }
      const parsed = countryDataSchema.safeParse(json);
      if (!parsed.success) throw new Error(`${file}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
      return parsed.data;
    });
}
