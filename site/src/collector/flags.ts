/**
 * Share of contributions that are private. GitHub exposes private activity only as one
 * number (restrictedContributionsCount), so it cannot be broken down or verified.
 */
export function privateShare(publicCount: number, privateCount: number): number {
  const total = publicCount + privateCount;
  return total <= 0 ? 0 : privateCount / total;
}

/**
 * Enough public activity to rank someone by public and private contributions together: at least minShare of the
 * total is public. Compared as counts, without division, so the boundary is exact.
 */
export const hasEnoughPublic = (publicCount: number, privateCount: number, minShare: number): boolean =>
  privateCount <= 0 || publicCount >= minShare * (publicCount + privateCount);

/** Rows above this share get a warning in the "all contributions" ranking. */
export const isMostlyPrivate = (publicCount: number, privateCount: number, threshold: number): boolean =>
  privateCount > 0 && privateShare(publicCount, privateCount) >= threshold;

export type Activity = {
  readonly commits: number;
  readonly prs: number;
  readonly issues: number;
  readonly reviews: number;
  /** Commits in the busiest repository of their own with fewer than quiet_stars stars. Absent: not checked. */
  readonly quiet?: number | undefined;
  /** Commits in other people's repositories with at least popular_stars stars. Absent: not checked. */
  readonly popular?: number | undefined;
};
export type AutomatedRule = {
  readonly min_commits: number;
  readonly ratio: number;
  readonly quiet_stars: number;
  readonly quiet_share: number;
  readonly popular_stars: number;
  readonly popular_share: number;
};

/**
 * Likely automated commits, only ever for a huge number of commits:
 * - a commit farm, almost nothing but commits. People who really work that much also open pull requests, file issues
 *   and review others' work; a script that commits all day does none of that;
 * - or most commits in one repository of their own that nobody stars: farms that also open pull requests;
 * - but never for someone whose commits mostly go to another owner's widely used project (a maintainer of FreeBSD
 *   ports or Liferay commits directly, without pull requests).
 * Without the repository numbers (not collected yet, or the request failed) only the first rule applies.
 * Returns which rule marks the account ("ratio" or "quiet"), or null when none does.
 */
export function automatedReason(a: Activity, rule: AutomatedRule): AutomatedReason | null {
  if (a.commits < rule.min_commits) return null;
  if (a.popular !== undefined && a.popular >= rule.popular_share * a.commits) return null;
  if (a.commits >= rule.ratio * Math.max(1, otherActivity(a))) return "ratio";
  return a.quiet !== undefined && a.quiet >= rule.quiet_share * a.commits ? "quiet" : null;
}
export type AutomatedReason = "ratio" | "quiet";

export const isLikelyAutomated = (a: Activity, rule: AutomatedRule): boolean => automatedReason(a, rule) !== null;

/** Pull requests, issues and reviews together: the activity a commit farm lacks. */
export const otherActivity = (a: Activity): number => a.prs + a.issues + a.reviews;

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
