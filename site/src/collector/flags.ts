/**
 * Share of contributions that are private. GitHub exposes private activity only as one
 * number (restrictedContributionsCount), so it cannot be broken down or verified.
 */
export function privateShare(publicCount: number, privateCount: number): number {
  const total = publicCount + privateCount;
  return total <= 0 ? 0 : privateCount / total;
}

/** Rows above this share get a warning in the "all contributions" ranking. */
export const isMostlyPrivate = (publicCount: number, privateCount: number, threshold: number): boolean =>
  privateCount > 0 && privateShare(publicCount, privateCount) >= threshold;

export type Activity = {
  readonly commits: number;
  readonly prs: number;
  readonly issues: number;
  readonly reviews: number;
};
export type AutomatedRule = { readonly min_commits: number; readonly ratio: number };

/**
 * A commit farm: a huge number of commits and almost nothing else. People who really work that much also open pull
 * requests, file issues and review others' work; a script that commits all day does none of that.
 */
export const isLikelyAutomated = (a: Activity, rule: AutomatedRule): boolean =>
  a.commits >= rule.min_commits && a.commits >= rule.ratio * Math.max(1, a.prs + a.issues + a.reviews);

const UNITS: readonly [number, string][] = [
  [1_000_000_000, "B"],
  [1_000_000, "M"],
  [1_000, "k"],
];

const roundShort = (value: number) => (value >= 10 ? Math.round(value) : Math.round(value * 10) / 10);

/** 999 → "999", 2345 → "2.3k", 12000 → "12k", 999_999 → "1M" (never "1000k"), 1_250_000 → "1.3M". */
export function compactNumber(n: number): string {
  for (const [i, [size, unit]] of UNITS.entries()) {
    if (n < size) continue;
    const rounded = roundShort(n / size);
    const bigger = UNITS[i - 1];
    // Rounding can reach the next unit: 999_500 is 999.5k → "1000k", which must read "1M".
    if (rounded >= 1000 && bigger) return `${roundShort(n / bigger[0])}${bigger[1]}`;
    return `${rounded}${unit}`;
  }
  // Below 1000 a value can still round up to the first unit only if it is not an integer; counts always are.
  return String(n);
}
