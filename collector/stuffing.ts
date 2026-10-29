import type { Preset } from "./preset.ts";

const words = (s: string) =>
  ` ${s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;

/**
 * Presets with at least one include term that appears as whole words in the location,
 * ordered by where the first matching term starts (the country mentioned first comes first).
 */
export function matchingPresets(location: string | null | undefined, presets: ReadonlyMap<string, Preset>): string[] {
  if (!location) return [];
  const haystack = words(location);
  const found: { slug: string; at: number }[] = [];
  for (const [slug, preset] of presets) {
    const positions = preset.include.map((term) => haystack.indexOf(words(term))).filter((i) => i >= 0);
    if (positions.length > 0) found.push({ slug, at: Math.min(...positions) });
  }
  return found.sort((a, b) => a.at - b.at || a.slug.localeCompare(b.slug)).map((f) => f.slug);
}

/**
 * Every person belongs to exactly one country: the one their location mentions first.
 * "Minsk, Belarus / Warsaw, Poland" counts only for Belarus; location stuffing like
 * "uk mx ksa drc cog togo cuba peru …" (seen in the PoC) gains nothing.
 * If none of our terms is recognised (GitHub search tokenises a little differently), the country
 * whose search found the person keeps them.
 */
export function countsFor(
  slug: string,
  location: string | null | undefined,
  presets: ReadonlyMap<string, Preset>,
): boolean {
  const matched = matchingPresets(location, presets);
  return matched.length === 0 || matched[0] === slug;
}
