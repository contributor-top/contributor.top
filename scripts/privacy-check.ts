// Fails if published output contains fields or patterns that must never leave the collector.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { loadCountries } from "../collector/data-dir.ts";

const FORBIDDEN_JSON_KEYS = ["name", "email", "bio", "company", "location", "status"];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const problems: string[] = [];

// 1. Data files: strict schema already rejects unknown fields; loading proves it.
const countries = loadCountries();

// 2. Built site: no emails anywhere, no forbidden keys in JSON.
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

for (const file of walk("dist")) {
  const ext = extname(file);
  if (ext !== ".html" && ext !== ".json") continue;
  const text = readFileSync(file, "utf8");
  const visible = ext === ".html" ? text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, "") : text;
  if (EMAIL.test(visible)) problems.push(`${file}: contains an email-like string`);
  if (ext === ".json") {
    for (const key of FORBIDDEN_JSON_KEYS) if (text.includes(`"${key}":`)) problems.push(`${file}: has "${key}" field`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`privacy-check ok (${countries.length} countries, dist scanned)`);
