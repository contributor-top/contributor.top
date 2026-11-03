import { describe, expect, it } from "vitest";
import {
  fitsBefore,
  parseTimings,
  reserveMs,
  serializeTimings,
  shouldContinue,
  UNKNOWN_RESERVE_MS,
} from "../src/collector/timing.ts";

const MINUTE = 60_000;

describe("country timings", () => {
  it("round-trips sorted, rounded to a tenth of a minute", () => {
    const text = serializeTimings(
      new Map([
        ["norway", 34.456],
        ["atlantis", 5],
      ]),
    );
    expect(text).toBe('{\n  "atlantis": 5,\n  "norway": 34.5\n}\n');
    expect(parseTimings(text)).toEqual(
      new Map([
        ["atlantis", 5],
        ["norway", 34.5],
      ]),
    );
  });

  it("treats a missing, broken or hostile file as never measured", () => {
    for (const text of [null, "", "{", "[]", '{"../x": 5}', '{"norway": -1}', '{"norway": "5"}', '{"norway": 1e9}']) {
      expect(parseTimings(text), String(text)).toEqual(new Map());
    }
    // Keys like __proto__ fail the slug rule instead of reaching an object.
    expect(parseTimings('{"__proto__": 5}')).toEqual(new Map());
  });

  it("reserves the last time with a margin, within bounds, and the biggest for unknown countries", () => {
    const timings = new Map([
      ["big", 34],
      ["small", 2],
      ["huge", 200],
    ]);
    expect(reserveMs("big", timings)).toBe(51 * MINUTE);
    expect(reserveMs("small", timings)).toBe(10 * MINUTE);
    expect(reserveMs("huge", timings)).toBe(90 * MINUTE);
    expect(reserveMs("new", timings)).toBe(UNKNOWN_RESERVE_MS);
    // The old fixed 20 minutes let a 35-minute country start and run out of time.
    expect(UNKNOWN_RESERVE_MS).toBeGreaterThanOrEqual(35 * MINUTE);
  });

  it("starts a country only if it can finish before the deadline", () => {
    expect(fitsBefore(0, 30 * MINUTE, 30 * MINUTE)).toBe(true);
    expect(fitsBefore(1, 30 * MINUTE, 30 * MINUTE)).toBe(false);
  });
});

describe("starting the next run", () => {
  it("continues only when countries were left for lack of time and the run achieved something", () => {
    expect(shouldContinue({ left: 5, updated: 40 })).toBe(true);
    expect(shouldContinue({ left: 0, updated: 40 })).toBe(false); // everything done: the cron takes over
    expect(shouldContinue({ left: 5, updated: 0 })).toBe(false); // nothing worked: never loop
  });
});
