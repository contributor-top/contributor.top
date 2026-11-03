import { createHmac } from "node:crypto";

/**
 * The opt-out list stores HMAC-SHA256(id) with a secret key, so it does not reveal who asked to be removed;
 * the list itself is encrypted as well (optout-list.ts), so it does not reveal how many or when either.
 */
export function optoutHash(githubId: number, key: string): string {
  if (!Number.isSafeInteger(githubId) || githubId <= 0) throw new RangeError("githubId must be a positive integer");
  if (key.length < 32) throw new RangeError("optout key must be at least 32 characters");
  return createHmac("sha256", key).update(String(githubId)).digest("hex");
}

const normalize = (s: string) => s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

/** A status opts out when it contains the phrase, case-insensitively ("… opt-out please" counts). */
export function statusMatches(status: string | null | undefined, phrase: string): boolean {
  if (!status) return false;
  return normalize(status).includes(normalize(phrase));
}

export type OptoutDecision = "opt-out" | "opt-in" | "none";

/** If both phrases are present, opting out wins: it is the safer reading. */
export function decide(status: string | null | undefined, optoutPhrase: string, optinPhrase: string): OptoutDecision {
  if (statusMatches(status, optoutPhrase)) return "opt-out";
  if (statusMatches(status, optinPhrase)) return "opt-in";
  return "none";
}
