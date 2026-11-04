export type Candidate = {
  readonly id: number;
  readonly login: string;
  readonly followers: number;
  readonly total: number; // contributionCalendar.totalContributions
  readonly restricted: number; // restrictedContributionsCount
  readonly commits: number;
  readonly prs: number;
  readonly issues: number;
  readonly reviews: number;
};

export type RankedRow = {
  readonly rank: number;
  readonly login: string;
  readonly id: number;
  readonly contributions: number;
};

export const TABS = {
  // The API occasionally reports more restricted than total contributions; never publish a negative count.
  public: (c: Candidate) => Math.max(0, c.total - c.restricted),
  all: (c: Candidate) => Math.max(0, c.total),
  commits: (c: Candidate) => Math.max(0, c.commits),
} as const;

export type Tab = keyof typeof TABS;

/** Code-point order: the same on every machine, unlike localeCompare. Used for every deterministic sort. */
export const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Deterministic order: score desc, then followers desc, then login asc (case-insensitive, #118), then id. */
export function rank(candidates: readonly Candidate[], score: (c: Candidate) => number, topN: number): RankedRow[] {
  // The same person can come back from two search queries; count everyone once (first occurrence wins).
  const unique = [...new Map(candidates.map((c) => [c.id, c] as const).reverse()).values()];
  return unique
    .map((c) => ({ c, s: score(c) }))
    .sort(
      (a, b) =>
        b.s - a.s ||
        b.c.followers - a.c.followers ||
        byCodePoint(a.c.login.toLowerCase(), b.c.login.toLowerCase()) ||
        a.c.id - b.c.id,
    )
    .slice(0, Math.max(0, topN)) // slice(0, -1) would silently drop the last row
    .map(({ c, s }, i) => ({ rank: i + 1, login: c.login, id: c.id, contributions: s }));
}
