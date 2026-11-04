// How long each country takes to collect, and what a run does with the time it has left.
import { z } from "zod";
import { SLUG } from "./patterns.ts";
import { byCodePoint } from "./rank.ts";

const MINUTE = 60_000;
/** A country never measured yet (a new preset, or a run before this file existed): as long as the biggest ones. */
export const UNKNOWN_RESERVE_MS = 40 * MINUTE;
/** Measured times vary with the load of the other workers: keep half as much again in reserve. */
const MARGIN = 1.5;
const MIN_RESERVE_MS = 10 * MINUTE;
const MAX_RESERVE_MS = 90 * MINUTE;

/**
 * timings.json in the data branch: minutes the last successful collection of each country took. Countries only,
 * no person; anything unreadable counts as never measured instead of stopping the run.
 */
const timingsSchema = z.record(z.string().regex(SLUG), z.number().positive().max(1000));

export function parseTimings(text: string | null): Map<string, number> {
  try {
    return new Map(Object.entries(timingsSchema.parse(JSON.parse(text ?? ""))));
  } catch {
    return new Map();
  }
}

/** Sorted keys and one decimal, so the file changes only when a time does. */
export const serializeTimings = (timings: ReadonlyMap<string, number>): string =>
  `${JSON.stringify(
    Object.fromEntries(
      [...timings].sort(([a], [b]) => byCodePoint(a, b)).map(([slug, m]) => [slug, Math.round(m * 10) / 10]),
    ),
    null,
    2,
  )}\n`;

/** Time to keep free before starting this country: its last measured time with a margin, within bounds. */
export function reserveMs(slug: string, timings: ReadonlyMap<string, number>): number {
  const minutes = timings.get(slug);
  if (minutes === undefined) return UNKNOWN_RESERVE_MS;
  return Math.min(MAX_RESERVE_MS, Math.max(MIN_RESERVE_MS, minutes * MINUTE * MARGIN));
}

/** Whether a country can still finish before the deadline. */
export const fitsBefore = (now: number, deadline: number, reserve: number): boolean => now + reserve <= deadline;

/**
 * Whether the run should start the next one itself instead of waiting for the hourly cron, which GitHub often
 * drops. `left` counts the countries due at the end of the run that it did not try: no time left for them, or due
 * only since it started. A country that failed or was held back stays due too, but chaining on it would collect it
 * again and again; the cron retries those. A run that updated nothing does not chain either, so a broken setup
 * never loops.
 */
export const shouldContinue = ({ left, updated }: { left: number; updated: number }): boolean =>
  left > 0 && updated > 0;
