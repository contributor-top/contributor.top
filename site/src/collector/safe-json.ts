const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * JSON for embedding inside <script>: escapes characters that could close the script element
 * or start HTML (`</script>`, `<!--`), plus line separators that break older JS parsers.
 * Defense in depth: display fields are already restricted by the schemas.
 */
export function jsonForScript(value: unknown): string {
  // JSON.stringify returns undefined (not a string) for undefined and functions.
  return (JSON.stringify(value) ?? "null")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll(LINE_SEPARATOR, "\\u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, "\\u2029");
}
