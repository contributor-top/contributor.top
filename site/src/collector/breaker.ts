import type { Config } from "./config.ts";
import type { CountryData } from "./country-data.ts";

/** How many of the previous top rows are compared to detect a reshuffled ranking. */
const TOP_COMPARED = 100;
/** Too few rows to judge a reshuffle. */
const MIN_TOP_COMPARED = 10;

/**
 * Circuit breaker: reasons not to publish a new collection because it looks broken
 * (empty, collapsed, reshuffled or with a jumped threshold) compared with the previous one.
 * An empty list means the data looks fine. A changed preset makes big changes expected;
 * the caller then reports the reasons instead of holding the data back.
 */
export function breakerReasons(
  previous: CountryData | undefined,
  next: CountryData,
  limits: Config["circuit_breaker"],
): string[] {
  if (!previous) return [];
  const reasons: string[] = [];

  if (next.tabs.public.length === 0 && previous.tabs.public.length > 0) reasons.push("the ranking came back empty");

  if (previous.considered > 0) {
    const drop = (previous.considered - next.considered) / previous.considered;
    if (drop > limits.max_candidate_drop) {
      reasons.push(`candidates dropped from ${previous.considered} to ${next.considered}`);
    }
  }

  const before = previous.tabs.public.slice(0, TOP_COMPARED).map((r) => r.id);
  if (before.length >= MIN_TOP_COMPARED) {
    const after = new Set(next.tabs.public.slice(0, TOP_COMPARED).map((r) => r.id));
    const changed = before.filter((id) => !after.has(id)).length / before.length;
    if (changed > limits.max_top_change)
      reasons.push(`${Math.round(changed * 100)}% of the top ${before.length} changed`);
  }

  const [a, b] = [previous.minFollowers, next.minFollowers];
  if (a > 0 && b > 0 && Math.max(a / b, b / a) > limits.max_threshold_jump) {
    reasons.push(`the follower threshold moved from ${a} to ${b}`);
  }
  return reasons;
}
