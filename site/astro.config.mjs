import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// The only inline scripts: the theme must apply before first paint (no flash), and the badge-link lookup on /find/
// must start while the page is parsed. Each hash is computed from the same file the page embeds, so the CSP and the
// script can never drift apart.
const inlineHash = (path) =>
  `sha256-${createHash("sha256")
    .update(readFileSync(new URL(path, import.meta.url), "utf8"))
    .digest("base64")}`;
const inlineHashes = ["./src/web/scripts/theme-init.js", "./src/web/scripts/find.js"].map(inlineHash);

/**
 * A <meta> CSP governs only what comes after it, and Astro emits it late in <head>, after the JSON-LD, the inline
 * theme script and the router. Move it right after <meta charset> on every page, so the whole document is covered.
 */
const CSP_META = /<meta http-equiv="content-security-policy" content="[^"]*">/i;
const CHARSET = '<meta charset="utf-8">';
const cspFirst = {
  name: "csp-first",
  hooks: {
    "astro:build:done": ({ dir }) => {
      const pages = (path) =>
        readdirSync(path).flatMap((name) => {
          const full = join(path, name);
          return statSync(full).isDirectory() ? pages(full) : full.endsWith(".html") ? [full] : [];
        });
      for (const page of pages(fileURLToPath(dir))) {
        const html = readFileSync(page, "utf8");
        const meta = html.match(CSP_META)?.[0];
        if (!meta || !html.includes(CHARSET)) throw new Error(`${page}: no CSP or charset meta to reorder`);
        writeFileSync(page, html.replace(meta, "").replace(CHARSET, CHARSET + meta));
      }
    },
  },
};

export default defineConfig({
  integrations: [cspFirst],
  site: "https://contributor.top",
  output: "static",
  srcDir: "./src/web",
  publicDir: "./src/public",
  // Integration tests build into a temporary directory.
  outDir: process.env.OUT_DIR ?? "./dist",
  trailingSlash: "always",
  // Pages are fetched when a link is hovered, so a click swaps the next one in at once.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  // Astro's client-side router does not support its CSP when pages carry their own inline scripts and styles,
  // because each page's hashes differ. Bundling all of them as files makes them 'self' on every page, and the
  // remaining inline scripts (theme-init, find) have the same hashes everywhere.
  build: { format: "directory", inlineStylesheets: "never" },
  // One stylesheet for the whole site (about 4 kB compressed): cached by the first page, so a badge link from /find/
  // or any other page switch never waits for another one.
  vite: { build: { assetsInlineLimit: 0, cssCodeSplit: false } },
  // Shiki writes inline styles that the CSP below forbids; the Markdown pages need no highlighting.
  markdown: { syntaxHighlight: false },
  security: {
    // Every other script is bundled by Astro into /_astro/*.js ('self'); styles are hashed by Astro.
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'self'",
        // Avatars only: the badge page shows shields.io URLs as text and imitates the badges offline.
        "img-src 'self' data: https://avatars.githubusercontent.com",
        "connect-src 'self' https://api.github.com",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: { hashes: inlineHashes },
      // Inline style="" attributes (badge colors) are harmless; scripts stay hash-only.
      styleDirective: { resources: [{ resource: "'unsafe-inline'", kind: "attribute" }] },
    },
  },
});
