import { readFileSync } from "node:fs";
import { isAlias, LineCounter, parseDocument, visit } from "yaml";
import type { z } from "zod";

export class ConfigError extends Error {
  constructor(
    readonly file: string,
    readonly issues: readonly string[],
  ) {
    super(`${file}:\n${issues.map((i) => `  ${i}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

/**
 * Parses a YAML file strictly (YAML 1.2, unique keys, no anchors, aliases or custom tags)
 * and validates it against a zod schema. Errors point to `file:line`.
 */
export function loadYaml<T>(file: string, schema: z.ZodType<T>, source = readFileSync(file, "utf8")): T {
  const lineCounter = new LineCounter();
  const doc = parseDocument(source, { version: "1.2", uniqueKeys: true, merge: false, lineCounter });
  const lineOf = (offset: number | undefined) => (offset === undefined ? 0 : lineCounter.linePos(offset).line);

  const issues = doc.errors.map((e) => `line ${lineOf(e.pos[0])}: ${e.message.split("\n")[0]}`);
  visit(doc, (_key, node) => {
    // Empty documents and empty values ("exclude:") are visited as null.
    if (node === null || node === undefined) return;
    if (isAlias(node)) issues.push(`line ${lineOf(node.range?.[0])}: aliases (*name) are not allowed`);
    const meta = node as { anchor?: string; tag?: string; range?: [number, number, number] };
    if (meta.anchor) issues.push(`line ${lineOf(meta.range?.[0])}: anchors (&name) are not allowed`);
    if (meta.tag && !meta.tag.startsWith("tag:yaml.org,2002:")) {
      issues.push(`line ${lineOf(meta.range?.[0])}: custom tags are not allowed`);
    }
  });
  if (issues.length > 0) throw new ConfigError(file, issues);
  if (doc.contents === null) throw new ConfigError(file, ["the file is empty"]);

  const result = schema.safeParse(doc.toJS());
  if (!result.success) {
    throw new ConfigError(
      file,
      result.error.issues.map((issue) => {
        const node = doc.getIn(issue.path as (string | number)[], true) as { range?: [number, number, number] } | null;
        const where = node?.range ? `line ${lineOf(node.range[0])}` : "root";
        const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
        return `${where}: ${path}${issue.message}`;
      }),
    );
  }
  return result.data;
}
