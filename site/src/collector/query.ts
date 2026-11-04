import type { Preset } from "./preset.ts";

/** GitHub limits search text to 256 characters excluding operators and qualifiers. */
const MAX_FREE_TEXT = 256;

const quote = (term: string) => `"${term.replaceAll('"', "")}"`;

/**
 * Builds the base user-search query for a preset. Several `location:` qualifiers are OR-ed
 * by GitHub (verified in the PoC), `-location:` excludes, quoted values match as phrases.
 */
export function buildQuery(preset: Preset): string {
  return [
    "type:user",
    ...preset.include.map((t) => `location:${quote(t)}`),
    ...preset.exclude.map((t) => `-location:${quote(t)}`),
  ].join(" ");
}

export type FollowersRange = { readonly min: number; readonly max: number | null };

export function withFollowers(base: string, { min, max }: FollowersRange): string {
  const followers = max === null ? `>=${min}` : `${min}..${max}`;
  return `${base} followers:${followers}`;
}

/** Qualifiers (`name:value`, `name:"quoted value"`, optionally negated) or free-text tokens. */
const TOKEN = /-?[a-z]+:"[^"]*"|-?[a-z]+:\S+|"[^"]*"|\S+/g;
const QUALIFIER = /^-?[a-z]+:/;

/** Free text is whatever is not a qualifier; the base query has none, so this guards future edits. */
export function freeTextLength(query: string): number {
  return (query.match(TOKEN) ?? []).filter((token) => !QUALIFIER.test(token)).join(" ").length;
}

export const fitsSearchLimits = (query: string): boolean => freeTextLength(query) <= MAX_FREE_TEXT;
