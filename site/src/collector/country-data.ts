import { z } from "zod";
import { displayTitle } from "./preset.ts";

/** GitHub logins: letters, digits and single hyphens, up to 39 characters. Also used as file names. */
export const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const row = z
  .object({
    rank: z.number().int().positive(),
    login: z.string().regex(LOGIN),
    id: z.number().int(),
    contributions: z.number().int().min(0),
  })
  .strict();

/**
 * A ranking must be consistent: ranks 1, 2, 3, … in order, contributions never increasing,
 * every login and id once (duplicates would collide in #anchors and badge files).
 */
const ranking = z.array(row).superRefine((rows, ctx) => {
  const logins = new Set<string>();
  const ids = new Set<number>();
  for (const [i, r] of rows.entries()) {
    if (r.rank !== i + 1) ctx.addIssue({ code: "custom", path: [i, "rank"], message: `expected rank ${i + 1}` });
    const previous = rows[i - 1];
    if (previous && r.contributions > previous.contributions) {
      ctx.addIssue({ code: "custom", path: [i, "contributions"], message: "rows must be sorted by contributions" });
    }
    const login = r.login.toLowerCase();
    if (logins.has(login)) ctx.addIssue({ code: "custom", path: [i, "login"], message: "duplicate login" });
    if (ids.has(r.id)) ctx.addIssue({ code: "custom", path: [i, "id"], message: "duplicate id" });
    logins.add(login);
    ids.add(r.id);
  }
});

const breakdown = z
  .object({
    commits: z.number().int().min(0),
    prs: z.number().int().min(0),
    issues: z.number().int().min(0),
    reviews: z.number().int().min(0),
    /** restrictedContributionsCount: one opaque number, not split by type. */
    private: z.number().int().min(0),
    /**
     * Only for accounts with ranking.automated.min_commits or more, and only counts (never repository names):
     * commits in their busiest own repository without stars to speak of, and commits in other owners' widely used
     * repositories. See isLikelyAutomated.
     */
    quiet: z.number().int().min(0).optional(),
    popular: z.number().int().min(0).optional(),
  })
  .strict();

/**
 * Published per-country data. Strict on purpose: an extra field (a name, an email, a raw location)
 * fails validation instead of leaking to the site.
 */
export const countryDataSchema = z
  .object({
    slug: z.string().regex(/^[a-z][a-z0-9_]{1,40}$/),
    title: displayTitle,
    updatedAt: z.iso.datetime(),
    totalUsers: z.number().int().min(0),
    considered: z.number().int().min(0),
    minFollowers: z.number().int().min(0),
    /** presetChecksum() of the preset this data was collected with; a different one re-queues the country. */
    presetChecksum: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .optional(),
    tabs: z.object({ public: ranking, all: ranking, commits: ranking }).strict(),
    breakdown: z.record(z.string().regex(/^-?\d+$/), breakdown),
  })
  .strict();

export type CountryData = z.infer<typeof countryDataSchema>;
export type Row = z.infer<typeof row>;
