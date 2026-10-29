import { z } from "zod";
import { loadYaml } from "./yaml.ts";

const share = z.number().gt(0).lt(1);

export const configSchema = z
  .object({
    site: z.object({ repo: z.string().regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/) }).strict(),
    ranking: z
      .object({
        top_n: z.number().int().positive(),
        top_choices: z.array(z.number().int().positive()).min(1),
        default_top: z.number().int().positive(),
        consider: z.number().int().positive(),
        world_top_n: z.number().int().positive(),
        private_flag_share: share,
      })
      .strict()
      .refine((r) => r.top_choices.every((c, i, all) => i === 0 || c > (all[i - 1] as number)), {
        message: "top_choices must be unique and in increasing order",
      })
      .refine((r) => r.top_choices.includes(r.default_top), { message: "default_top must be one of top_choices" })
      .refine((r) => r.top_choices.every((c) => c <= r.top_n), { message: "top_choices must not exceed top_n" })
      .refine((r) => r.consider >= r.top_n, { message: "consider must be at least top_n" }),
    collector: z
      .object({
        batch_size: z.number().int().min(1).max(20),
        pause_ms: z.number().int().min(0),
        max_skipped_per_country: z.number().int().min(0),
        budget_floor: share,
      })
      .strict(),
    freshness: z
      .object({
        target_hours: z.number().int().positive(),
        min_refresh_hours: z.number().int().positive(),
        max_run_minutes: z.number().int().min(10).max(350), // a GitHub-hosted job is capped at 6 h
        stale_days: z.number().int().positive(),
      })
      .strict()
      .refine((f) => f.min_refresh_hours <= f.target_hours, {
        message: "min_refresh_hours must not exceed target_hours",
      })
      .refine((f) => f.stale_days * 24 > f.target_hours, { message: "stale_days must be longer than target_hours" }),
    circuit_breaker: z
      .object({ max_candidate_drop: share, max_top_change: share, max_threshold_jump: z.number().gt(1) })
      .strict(),
    privacy: z
      .object({
        optout_phrase: z.string().min(5).max(60),
        optin_phrase: z.string().min(5).max(60),
        dropped_stub_days: z.number().int().min(0),
      })
      .strict()
      // Statuses are matched by "contains", so neither phrase may contain the other:
      // an opt-in status containing the opt-out phrase would be read as opt-out forever.
      .refine(
        (p) => {
          const out = p.optout_phrase.toLowerCase();
          const inn = p.optin_phrase.toLowerCase();
          return !out.includes(inn) && !inn.includes(out);
        },
        { message: "optout_phrase and optin_phrase must not contain each other" },
      ),
    denylist_ids: z.array(z.number().int().positive()),
    reserved_slugs: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;

export const loadConfig = (file = "../config.yml"): Config => loadYaml(file, configSchema);
