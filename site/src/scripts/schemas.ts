// Generates JSON Schemas from the zod schemas for editor autocompletion in YAML files.
import { mkdirSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { configSchema } from "../collector/config.ts";
import { presetSchema } from "../collector/preset.ts";

mkdirSync("src/schemas", { recursive: true });
for (const [name, schema] of [
  ["config", configSchema],
  ["preset", presetSchema],
] as const) {
  const json = z.toJSONSchema(schema, { unrepresentable: "any" });
  writeFileSync(`src/schemas/${name}.schema.json`, `${JSON.stringify(json, null, 2)}\n`);
}
console.log("src/schemas/*.schema.json written");
