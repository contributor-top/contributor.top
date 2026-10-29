import type { FollowersRange } from "./query.ts";

/** Returns how many users match `followers >= min` (and `<= max` when given). */
export type CountFn = (range: FollowersRange) => Promise<number>;

/** GitHub search returns at most this many results per query. */
export const SEARCH_CAP = 1000;

/**
 * No GitHub account has anywhere near this many followers. If counts still have not dropped here,
 * the API is returning nonsense (approximate or stuck counts) and we stop instead of looping forever.
 */
const MAX_FOLLOWERS = 2 ** 27;

const stuck = (what: string) =>
  new Error(`${what}: follower counts never dropped below the limit; the search API returned inconsistent counts`);

/** Wraps the API so a count that is not a non-negative integer (NaN, -1, 1.5) fails loudly instead of misleading us. */
const checked =
  (count: CountFn): CountFn =>
  async (range) => {
    const n = await count(range);
    if (!Number.isSafeInteger(n) || n < 0) throw new Error(`search API returned an invalid count: ${n}`);
    return n;
  };

/**
 * Smallest follower threshold T such that at most `consider` users have `followers >= T`.
 * Search results are not trusted to be sorted (#112), so we pick candidates by count instead.
 * Relies on the count being non-increasing in T, which holds for follower ranges.
 */
export async function findThreshold(rawCount: CountFn, consider: number): Promise<number> {
  const count = checked(rawCount);
  if ((await count({ min: 0, max: null })) <= consider) return 0;
  let low = 0; // count(low) > consider
  let high = 1;
  while ((await count({ min: high, max: null })) > consider) {
    if (high >= MAX_FOLLOWERS) throw stuck("findThreshold");
    low = high;
    high *= 2;
  }
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if ((await count({ min: mid, max: null })) > consider) low = mid;
    else high = mid;
  }
  return high;
}

/**
 * Splits `followers >= min` into consecutive ranges with at most SEARCH_CAP users each,
 * so every candidate can be paged through without hitting the 1000-result cap.
 * A single follower value with more than SEARCH_CAP users cannot be split and is returned as is.
 */
export async function splitRanges(rawCount: CountFn, min: number, cap = SEARCH_CAP): Promise<FollowersRange[]> {
  const count = checked(rawCount);
  const total = await count({ min, max: null });
  if (total <= cap) return [{ min, max: null }];

  // Find an upper bound above which at most `cap` users remain.
  let upper = Math.max(min * 2, min + 1);
  while ((await count({ min: upper, max: null })) > cap) {
    if (upper >= MAX_FOLLOWERS) throw stuck("splitRanges");
    upper *= 2;
  }
  const tail: FollowersRange = { min: upper, max: null };
  return [...(await splitBounded(count, min, upper - 1, cap)), tail];
}

async function splitBounded(count: CountFn, min: number, max: number, cap: number): Promise<FollowersRange[]> {
  if (min > max) return [];
  if (min === max || (await count({ min, max })) <= cap) return [{ min, max }];
  const mid = Math.floor((min + max) / 2);
  return [...(await splitBounded(count, min, mid, cap)), ...(await splitBounded(count, mid + 1, max, cap))];
}
