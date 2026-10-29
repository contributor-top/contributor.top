import { type CountryData, LOGIN } from "./country-data.ts";
import type { Tab } from "./rank.ts";

export type Badge = {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
  readonly namedLogo: string;
  readonly cacheSeconds: number;
};

const MEDALS: Readonly<Record<number, string>> = { 1: "d4a72c", 2: "a0a8b0", 3: "b87333" };
const DEFAULT_COLOR = "0969da";

export const badgeColor = (rank: number): string => MEDALS[rank] ?? DEFAULT_COLOR;

/** File name suffix and short label for each ranking: u/<login>.json, u/<login>.all.json, u/<login>.commits.json. */
export const BADGE_KINDS: Readonly<Record<Tab, { suffix: string; label: string }>> = {
  public: { suffix: "", label: "public contributions" },
  all: { suffix: ".all", label: "all contributions" },
  commits: { suffix: ".commits", label: "public commits" },
};

type Best = { rank: number; title: string };

const isBetter = (candidate: Best, current: Best | undefined): boolean =>
  !current || candidate.rank < current.rank || (candidate.rank === current.rank && candidate.title < current.title);

/** Best rank per lowercase login in one ranking across all countries; ties go to the alphabetically first country. */
function bestRanks(countries: readonly CountryData[], tab: Tab): Map<string, Best> {
  const best = new Map<string, Best>();
  for (const country of countries) {
    for (const row of country.tabs[tab]) {
      // The login becomes a file name: never trust it without checking, even after schema validation.
      if (!LOGIN.test(row.login)) throw new Error(`refusing to write a badge for an invalid login in ${country.slug}`);
      const key = row.login.toLowerCase();
      const candidate = { rank: row.rank, title: country.title };
      if (isBetter(candidate, best.get(key))) best.set(key, candidate);
    }
  }
  return best;
}

/**
 * shields.io endpoint badges, one per login and ranking. File names are lowercase:
 * GitHub logins are case-insensitive, GitHub Pages paths are not.
 */
export function buildBadges(countries: readonly CountryData[]): Map<string, Badge> {
  const badges = new Map<string, Badge>();
  for (const [tab, kind] of Object.entries(BADGE_KINDS) as [Tab, (typeof BADGE_KINDS)[Tab]][]) {
    for (const [login, { rank, title }] of bestRanks(countries, tab)) {
      badges.set(`${login}${kind.suffix}`, {
        schemaVersion: 1,
        label: "contributors.top",
        message: `#${rank} ${title} (${kind.label})`,
        color: badgeColor(rank),
        namedLogo: "github",
        cacheSeconds: 3600,
      });
    }
  }
  return badges;
}
