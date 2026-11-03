import { describe, expect, it } from "vitest";
import { staleCountries, staleReport } from "../src/collector/freshness.ts";

const now = new Date("2026-11-03T12:00:00.000Z");
const dated = (slug: string, updatedAt: string) => ({ slug, title: slug.toUpperCase(), updatedAt });

describe("stale countries", () => {
  it("lists countries older than stale_days, oldest first, and keeps the boundary fresh", () => {
    const stale = staleCountries(
      [
        dated("fresh", "2026-11-02T12:00:00.000Z"),
        dated("edge", "2026-10-31T12:00:00.000Z"), // exactly 3 days: still fresh
        dated("old", "2026-10-31T11:00:00.000Z"),
        dated("older", "2026-10-25T02:30:00.000Z"),
      ],
      now,
      3,
    );
    expect(stale).toEqual([
      { slug: "older", title: "OLDER", hours: 225 },
      { slug: "old", title: "OLD", hours: 73 },
    ]);
  });

  it("counts an unreadable date as stale instead of hiding the country", () => {
    expect(staleCountries([dated("broken", "not a date")], now, 3)).toEqual([
      { slug: "broken", title: "BROKEN", hours: Number.POSITIVE_INFINITY },
    ]);
  });

  it("reports titles, slugs and ages only", () => {
    const report = staleReport(
      [
        { slug: "older", title: "Older", hours: 201 },
        { slug: "broken", title: "Broken", hours: Number.POSITIVE_INFINITY },
      ],
      3,
    );
    expect(report).toContain("2 countries have not been updated for more than 3 days.");
    expect(report).toContain("| Older (`older`) | 8 d 9 h |");
    expect(report).toContain("| Broken (`broken`) | unknown (unreadable date) |");
    expect(staleReport([{ slug: "a", title: "A", hours: 80 }], 3)).toContain("1 country has not");
  });
});
