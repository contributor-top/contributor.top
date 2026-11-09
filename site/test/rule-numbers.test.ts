import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/collector/config.ts";
import { fillNumbers, ruleNumbers } from "../src/web/lib/rule-numbers.ts";

describe("rule numbers in Methodology", () => {
  const numbers = ruleNumbers(loadConfig());
  const de = new Intl.NumberFormat("de").format;

  it("fills the names with the configured numbers, written the language's way", () => {
    expect(fillNumbers("{{min_commits}} commits, {{private_flag}}%, {{min_public}}%", numbers, de)).toBe(
      "20.000 commits, 90%, 1%",
    );
  });

  it("fails on a name it does not know, so a typo cannot reach the page", () => {
    expect(() => fillNumbers("{{min_comits}}", numbers, de)).toThrow("{{min_comits}}");
  });
});
