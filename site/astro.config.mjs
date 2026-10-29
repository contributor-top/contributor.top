import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";

// The only inline script: it must run before first paint (theme, no flash). Its hash is computed
// from the same file the layout embeds, so the CSP and the script can never drift apart.
const themeInit = readFileSync(new URL("./src/web/scripts/theme-init.js", import.meta.url), "utf8");
const themeInitHash = `sha256-${createHash("sha256").update(themeInit).digest("base64")}`;

export default defineConfig({
  site: "https://contributors.top",
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
  // one remaining inline script (theme-init) has the same hash everywhere.
  build: { format: "directory", inlineStylesheets: "never" },
  vite: { build: { assetsInlineLimit: 0 } },
  // Shiki writes inline styles that the CSP below forbids; the Markdown pages need no highlighting.
  markdown: { syntaxHighlight: false },
  security: {
    // Every other script is bundled by Astro into /_astro/*.js ('self'); styles are hashed by Astro.
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://avatars.githubusercontent.com https://img.shields.io",
        "connect-src 'self' https://api.github.com",
        "font-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests",
      ],
      scriptDirective: { hashes: [themeInitHash] },
      // Inline style="" attributes (badge colors) are harmless; scripts stay hash-only.
      styleDirective: { resources: [{ resource: "'unsafe-inline'", kind: "attribute" }] },
    },
  },
});
