import { type CountryData, countryDataSchema } from "./country-data.ts";

const HASH = /^[0-9a-f]{64}$/;
const HEADER = "# HMAC-SHA256 of GitHub user IDs that opted out of contributors.top. Only hashes, no IDs or logins.";

/** One hash per line; blank lines and # comments are ignored; anything else is an error, not a silent skip. */
export function parseHashes(text: string): Set<string> {
  const hashes = new Set<string>();
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (!HASH.test(line)) throw new Error(`opt-out list line ${i + 1} is not a SHA-256 hash`);
    hashes.add(line);
  }
  return hashes;
}

/** Sorted, so the file's history shows only additions and removals. */
export const serializeHashes = (hashes: Iterable<string>): string =>
  `${HEADER}\n${[...new Set(hashes)].sort().join("\n")}\n`;

/**
 * Removes people from published data right away (an opt-out must not wait for the country's next update).
 * Everyone below moves up; the ranking is one row shorter until the next collection.
 */
export function purgeCountry(data: CountryData, ids: ReadonlySet<number>): CountryData {
  const tabs = Object.fromEntries(
    Object.entries(data.tabs).map(([tab, rows]) => [
      tab,
      rows.filter((r) => !ids.has(r.id)).map((r, i) => ({ ...r, rank: i + 1 })),
    ]),
  );
  const breakdown = Object.fromEntries(Object.entries(data.breakdown).filter(([id]) => !ids.has(Number(id))));
  return countryDataSchema.parse({ ...data, tabs, breakdown });
}

/** Whether purging would change anything (so unchanged files are not rewritten). */
export const mentionsAny = (data: CountryData, ids: ReadonlySet<number>): boolean =>
  Object.values(data.tabs).some((rows) => rows.some((r) => ids.has(r.id)));
