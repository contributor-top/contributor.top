import { type Preset, presetChecksum } from "./preset.ts";

type DueReason = "requested" | "new" | "preset-changed" | "stale";
export type Due = { readonly slug: string; readonly reason: DueReason };

export type Existing = { readonly updatedAt: string; readonly presetChecksum?: string | undefined };

const ORDER: Record<DueReason, number> = { requested: 0, new: 1, "preset-changed": 2, stale: 3 };
const HOUR = 3_600_000;

/**
 * Which countries to collect, in order: explicitly requested ones; countries without data; countries
 * whose preset changed; then the stalest. A country is never refreshed more often than minRefreshHours
 * unless it is requested or its preset changed.
 */
export function dueCountries({
  presets,
  existing,
  now,
  minRefreshHours,
  requested = [],
}: {
  presets: ReadonlyMap<string, Preset>;
  existing: ReadonlyMap<string, Existing>;
  now: Date;
  minRefreshHours: number;
  requested?: readonly string[];
}): Due[] {
  if (requested.length > 0) {
    const unknown = requested.filter((slug) => !presets.has(slug));
    if (unknown.length > 0) throw new Error(`unknown countries: ${unknown.join(", ")}`);
    return [...new Set(requested)].map((slug) => ({ slug, reason: "requested" }));
  }

  const due: (Due & { age: number })[] = [];
  for (const [slug, preset] of presets) {
    const current = existing.get(slug);
    if (!current) {
      due.push({ slug, reason: "new", age: 0 });
      continue;
    }
    const age = now.getTime() - Date.parse(current.updatedAt);
    if (current.presetChecksum !== presetChecksum(preset)) due.push({ slug, reason: "preset-changed", age });
    // An unreadable date counts as very old rather than blocking the country forever.
    else if (!(age < minRefreshHours * HOUR))
      due.push({ slug, reason: "stale", age: Number.isNaN(age) ? Infinity : age });
  }
  return due
    .sort((a, b) => ORDER[a.reason] - ORDER[b.reason] || b.age - a.age || (a.slug < b.slug ? -1 : 1))
    .map(({ slug, reason }) => ({ slug, reason }));
}
