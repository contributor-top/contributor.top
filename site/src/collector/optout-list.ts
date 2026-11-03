import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { type CountryData, countryDataSchema } from "./country-data.ts";

const HASH = /^[0-9a-f]{64}$/;
const HEADER = "# HMAC-SHA256 of GitHub user IDs that opted out of contributors.top. Only hashes, no IDs or logins.";

/** One hash per line; blank lines and # comments are ignored; anything else is an error, not a silent skip. */
export function parseHashes(text: string): Set<string> {
  const hashes = new Set<string>();
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (!HASH.test(line)) throw new Error(`opt-out list line ${i + 1} is not a SHA-256 hash`);
    hashes.add(line);
  }
  return hashes;
}

/** Sorted, so the file's history shows only additions and removals. */
export const serializeHashes = (hashes: Iterable<string>): string =>
  `${HEADER}\n${[...new Set(hashes)].sort().join("\n")}\n`;

/**
 * The published opt-out list: the hashes encrypted with a key derived from OPTOUT_KEY, padded to a multiple of
 * PAD_TO entries and encrypted with a fresh nonce on every write. The hashes alone hide who opted out, but a plain
 * list grows by one line exactly when someone does, and the branch history would show when, and so whose row
 * disappeared at the same time. This file changes on every run and its size only every PAD_TO opt-outs.
 */
export const LIST_FILE = "list.enc";
/** The plain list before the list was encrypted; read once more, then removed. */
export const LEGACY_FILE = "hashes.txt";

const PAD_TO = 256;
/** Part of the key derivation and the authenticated data: never change it (not even with the domain). */
const VERSION = "opt-out list v1";
const LIST_HEADER =
  "# Encrypted opt-out list of contributors.top (AES-256-GCM): neither who nor how many. Re-encrypted on every run.";
const NONCE = 12;
const TAG = 16;
const HASH_BYTES = 32;

/** Its own key: the HMAC key never encrypts anything directly. */
const listKey = (optoutKey: string): Buffer => Buffer.from(hkdfSync("sha256", optoutKey, "", VERSION, 32));

export function encryptHashes(hashes: Iterable<string>, optoutKey: string): string {
  const sorted = [...new Set(hashes)].sort();
  for (const hash of sorted) if (!HASH.test(hash)) throw new Error("refusing to encrypt something that is not a hash");
  const slots = Math.max(1, Math.ceil(sorted.length / PAD_TO)) * PAD_TO;
  // Unused slots stay all zeros; HMAC-SHA256 never gives 32 zero bytes in practice.
  const plain = Buffer.alloc(slots * HASH_BYTES);
  for (const [i, hash] of sorted.entries()) Buffer.from(hash, "hex").copy(plain, i * HASH_BYTES);
  const nonce = randomBytes(NONCE);
  const cipher = createCipheriv("aes-256-gcm", listKey(optoutKey), nonce);
  cipher.setAAD(Buffer.from(VERSION));
  const sealed = Buffer.concat([cipher.update(plain), cipher.final()]);
  return `${LIST_HEADER}\n${Buffer.concat([nonce, cipher.getAuthTag(), sealed]).toString("base64")}\n`;
}

/** Throws rather than returning an empty list: losing the list would put everyone who left back on the site. */
export function decryptHashes(text: string, optoutKey: string): Set<string> {
  const body = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    .join("");
  const raw = Buffer.from(body, "base64");
  const sealed = raw.length - NONCE - TAG;
  if (sealed <= 0 || sealed % (PAD_TO * HASH_BYTES) !== 0) {
    throw new Error("the opt-out list is damaged");
  }
  let plain: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", listKey(optoutKey), raw.subarray(0, NONCE));
    decipher.setAAD(Buffer.from(VERSION));
    decipher.setAuthTag(raw.subarray(NONCE, NONCE + TAG));
    plain = Buffer.concat([decipher.update(raw.subarray(NONCE + TAG)), decipher.final()]);
  } catch {
    throw new Error("the opt-out list cannot be decrypted: wrong OPTOUT_KEY or a damaged file");
  }
  const hashes = new Set<string>();
  for (let i = 0; i < plain.length; i += HASH_BYTES) {
    const slot = plain.subarray(i, i + HASH_BYTES);
    if (slot.some((byte) => byte !== 0)) hashes.add(slot.toString("hex"));
  }
  return hashes;
}

/**
 * Removes people from published data right away (an opt-out must not wait for the country's next update).
 * Everyone below moves up; the ranking is one row shorter until the next collection.
 */
export function purgeCountry(data: CountryData, ids: ReadonlySet<number>): CountryData {
  const tabs = Object.fromEntries(
    Object.entries(data.tabs).map(([tab, rows]) => [
      tab,
      rows.filter((r) => !ids.has(r.id)).map((r, i) => ({ ...r, rank: i + 1 })),
    ]),
  );
  const breakdown = Object.fromEntries(Object.entries(data.breakdown).filter(([id]) => !ids.has(Number(id))));
  return countryDataSchema.parse({ ...data, tabs, breakdown });
}

/** Whether purging would change anything (so unchanged files are not rewritten). */
export const mentionsAny = (data: CountryData, ids: ReadonlySet<number>): boolean =>
  Object.values(data.tabs).some((rows) => rows.some((r) => ids.has(r.id)));
