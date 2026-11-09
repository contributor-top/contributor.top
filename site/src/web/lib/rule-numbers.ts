// The numbers of the rules, in Methodology: the Markdown names them as {{name}} and the page fills them in from
// config.yml, written the language's way, so the text can never disagree with what the collector does. A name that
// is not here fails the build.
import type { Config } from "../../collector/config.ts";

const percent = (share: number) => Math.round(share * 100);

/** Every number the Markdown may name, from the configuration. */
export function ruleNumbers(config: Config): Record<string, number> {
  const { ranking } = config;
  const a = ranking.automated;
  return {
    consider: ranking.consider,
    private_flag: percent(ranking.private_flag_share),
    min_public: percent(ranking.min_public_share),
    min_commits: a.min_commits,
    ratio: a.ratio,
    quiet_stars: a.quiet_stars,
    quiet_share: percent(a.quiet_share),
    popular_stars: a.popular_stars,
    popular_share: percent(a.popular_share),
  };
}

const PLACEHOLDER = /[{][{]([a-z_]+)[}][}]/g;

/** Fills in the {{names}} of a text with the numbers, formatted by `number`; an unknown name throws. */
export function fillNumbers(text: string, numbers: Record<string, number>, number: (n: number) => string): string {
  return text.replace(PLACEHOLDER, (_, name: string) => {
    const value = numbers[name];
    if (value === undefined) throw new Error(`Markdown names an unknown number: {{${name}}}`);
    return number(value);
  });
}
