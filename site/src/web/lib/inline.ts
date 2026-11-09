// The scripts a page carries inline (src/web/scripts): the theme and the ranking's linked row must apply before first
// paint, and the early row and badge-link lookups must start while the page is parsed. Every page carries them again,
// so they go in minified (a ranking page ships about 2 kB gzip less); the source files keep their comments.
// astro.config.mjs hashes this same text for the CSP, so the script and its hash can never drift apart.
import { minifySync } from "vite";

// Thousands of pages embed the same four scripts: each is minified once (per source text, so edits in dev count).
const done = new Map<string, string>();

/** The script `name`.js, given its source, as the page embeds it. */
export function inlineScript(name: string, source: string): string {
  let code = done.get(source);
  if (code === undefined) {
    code = minifySync(`${name}.js`, source, { compress: true, mangle: true }).code.trim();
    done.set(source, code);
  }
  return code;
}
