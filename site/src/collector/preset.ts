import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import { ConfigError, loadYaml } from "./yaml.ts";

/** A location string: letters, digits, spaces and a little punctuation, no URLs or mentions. */
const locationTerm = z
  .string()
  .min(2)
  .max(64)
  .refine((s) => s === s.normalize("NFC"), { message: "must be NFC-normalized" })
  .refine((s) => s === s.trim(), { message: "must not have leading or trailing spaces" })
  .refine((s) => /^[\p{L}\p{M}\p{N} ,.'’-]+$/u.test(s), {
    message: "may contain only letters, digits, spaces and , . ' -",
  })
  .refine((s) => /[\p{L}\p{N}]/u.test(s), { message: "must contain a letter or digit" });

/**
 * A display name: letters, digits, spaces and a little punctuation. It is rendered into HTML,
 * JSON-LD and badges, so no markup characters (< > & " / `) may ever get in.
 */
export const displayTitle = z
  .string()
  .min(2)
  .max(64)
  .regex(/^[\p{L}\p{M}\p{N} ,.'’()-]+$/u, { message: "may contain only letters, digits, spaces and , . ' ( ) -" })
  .regex(/[\p{L}\p{N}]/u, { message: "must contain a letter or digit" })
  .refine((s) => s === s.trim(), { message: "must not have leading or trailing spaces" });

export const presetSchema = z
  .object({
    title: displayTitle,
    iso: z.union([z.string().regex(/^[A-Z]{2}$/, { message: "must be a 2-letter ISO code in quotes" }), z.null()]),
    // The collector splits long presets into several searches (United States has ~130 terms).
    include: z.array(locationTerm).min(1).max(150),
    exclude: z.array(locationTerm).max(30),
    post_filter: z.record(z.string(), z.array(z.string().min(1).max(32)).min(1)).optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const seen = new Set<string>();
    for (const [i, term] of p.include.entries()) {
      const key = term.toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["include", i], message: `duplicate "${term}"` });
      seen.add(key);
    }
    for (const [i, term] of p.exclude.entries()) {
      if (seen.has(term.toLowerCase())) {
        ctx.addIssue({ code: "custom", path: ["exclude", i], message: `"${term}" is also in include` });
      }
    }
    for (const key of Object.keys(p.post_filter ?? {})) {
      if (!seen.has(key.toLowerCase())) {
        ctx.addIssue({
          code: "custom",
          path: ["post_filter", key],
          message: "post_filter key must be an include term",
        });
      }
    }
  });

export type Preset = z.infer<typeof presetSchema>;

const SLUG = /^[a-z][a-z0-9_]{1,40}$/;

export function validateSlug(slug: string, reserved: readonly string[]): string | null {
  if (!SLUG.test(slug)) return "file name must match ^[a-z][a-z0-9_]{1,40}$";
  if (reserved.includes(slug)) return `"${slug}" is reserved by the site`;
  return null;
}

/**
 * What to do with a file in the presets directory: load it, skip it (templates, dotfiles, other files),
 * or report it. A preset saved as .yaml or .YML would otherwise be skipped silently.
 */
function classify(name: string, reserved: readonly string[]): "skip" | { error: string } | { slug: string } {
  if (name.startsWith("_") || name.startsWith(".")) return "skip";
  if (/\.ya?ml$/i.test(name) && !name.endsWith(".yml")) return { error: "presets must use the .yml extension" };
  if (!name.endsWith(".yml")) return "skip";
  const slug = basename(name, ".yml");
  const slugError = validateSlug(slug, reserved);
  return slugError ? { error: slugError } : { slug };
}

/** Badges and /find/ map a country title back to its page, so titles must be unique. */
function duplicateTitles(dir: string, presets: ReadonlyMap<string, Preset>): string[] {
  const seen = new Map<string, string>();
  const errors: string[] = [];
  for (const [slug, preset] of presets) {
    const other = seen.get(preset.title.toLowerCase());
    if (other) errors.push(`${join(dir, `${slug}.yml`)}: title "${preset.title}" is already used by ${other}.yml`);
    seen.set(preset.title.toLowerCase(), slug);
  }
  return errors;
}

/** Loads every presets/<slug>.yml except files starting with "_" (templates). */
export function loadPresets(dir: string, reserved: readonly string[]): Map<string, Preset> {
  const presets = new Map<string, Preset>();
  const errors: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const kind = classify(name, reserved);
    if (kind === "skip") continue;
    if ("error" in kind) {
      errors.push(`${join(dir, name)}: ${kind.error}`);
      continue;
    }
    try {
      presets.set(kind.slug, loadYaml(join(dir, name), presetSchema));
    } catch (e) {
      errors.push(e instanceof ConfigError ? e.message : String(e));
    }
  }
  errors.push(...duplicateTitles(dir, presets));
  if (errors.length > 0) throw new ConfigError(dir, errors);
  return presets;
}

/** Stable checksum of everything that affects the search; a change re-queues the country. */
export function presetChecksum(p: Preset): string {
  const canonical = JSON.stringify({
    include: [...p.include].map((t) => t.toLowerCase()).sort(),
    exclude: [...p.exclude].map((t) => t.toLowerCase()).sort(),
    post_filter: Object.entries(p.post_filter ?? {})
      .map(([k, v]) => [k.toLowerCase(), [...v].map((x) => x.toLowerCase()).sort()])
      .sort(),
  });
  return createHash("sha256").update(canonical).digest("hex");
}
