import { type CountryData, LOGIN } from "./country-data.ts";
import type { AutomatedRule } from "./flags.ts";
import type { Tab } from "./rank.ts";
import { worldRanking } from "./world.ts";

export type Badge = {
  readonly schemaVersion: 1;
  readonly label: string;
  readonly message: string;
  readonly color: string;
  readonly namedLogo: string;
  readonly cacheSeconds: number;
};

const MEDALS: Readonly<Record<number, string>> = { 1: "d4a72c", 2: "a0a8b0", 3: "b87333" };
// shields.io's own "blue", the color most rank badges on GitHub profiles use.
const DEFAULT_COLOR = "007ec6";

export const badgeColor = (rank: number): string => MEDALS[rank] ?? DEFAULT_COLOR;

/** File name suffix and short label for each ranking: u/<login>.json, u/<login>.all.json, u/<login>.commits.json. */
export const BADGE_KINDS: Readonly<Record<Tab, { suffix: string; label: string }>> = {
  public: { suffix: "", label: "public contributions" },
  all: { suffix: ".all", label: "all contributions" },
  commits: { suffix: ".commits", label: "public commits" },
};

/**
 * The world badge, u/<login>.world.json: "#7 World (public contributions)", worded like the country badges.
 * /find/ tells it apart by tab=world and its own file, never by this text, so a country titled "World" could
 * not be mistaken for it.
 */
export const WORLD_BADGE = { suffix: ".world", place: "World", label: "public contributions" } as const;

type Best = { rank: number; title: string };

const isBetter = (candidate: Best, current: Best | undefined): boolean =>
  !current || candidate.rank < current.rank || (candidate.rank === current.rank && candidate.title < current.title);

/** The login becomes a file name: never trust it without checking, even after schema validation. */
function checkLogin(login: string, where: string): string {
  if (!LOGIN.test(login)) throw new Error(`refusing to write a badge for an invalid login in ${where}`);
  return login.toLowerCase();
}

/** Best rank per lowercase login in one ranking across all countries; ties go to the alphabetically first country. */
function bestRanks(countries: readonly CountryData[], tab: Tab): Map<string, Best> {
  const best = new Map<string, Best>();
  for (const country of countries) {
    for (const row of country.tabs[tab]) {
      const key = checkLogin(row.login, country.slug);
      const candidate = { rank: row.rank, title: country.title };
      if (isBetter(candidate, best.get(key))) best.set(key, candidate);
    }
  }
  return best;
}

const badge = (message: string, color: string): Badge => ({
  schemaVersion: 1,
  label: "contributor.top",
  message,
  color,
  namedLogo: "github",
  cacheSeconds: 3600,
});

const ranked = (rank: number, place: string, label: string): Badge =>
  badge(`#${rank} ${place} (${label})`, badgeColor(rank));

// Grey, and darker than the silver of #2, so that "unranked" never reads as a medal.
const UNRANKED_COLOR = "6e7781";

/** "Belarus: unranked (public commits)". Without a file shields.io shows "resource not found", which looks broken. */
const unranked = (place: string, label: string): Badge => badge(`${place}: unranked (${label})`, UNRANKED_COLOR);

/**
 * shields.io endpoint badges, one per login and ranking, plus a world badge for everyone in the world ranking.
 * Everyone in at least one ranking gets all four files: a ranking they are not in (the world ranking too, when
 * their activity looks automated) reads "unranked", with the country of their best rank. File names are lowercase:
 * GitHub logins are case-insensitive, GitHub Pages paths are not. Pass only countries that have a page, so that
 * every badge links to a ranking that exists.
 */
export function buildBadges(
  countries: readonly CountryData[],
  worldTopN: number,
  automated?: AutomatedRule,
): Map<string, Badge> {
  const badges = new Map<string, Badge>();
  // Lowercase login → the country of their best rank in the first ranking (BADGE_KINDS order) they are in.
  const home = new Map<string, string>();
  for (const [tab, kind] of Object.entries(BADGE_KINDS) as [Tab, (typeof BADGE_KINDS)[Tab]][]) {
    for (const [login, { rank, title }] of bestRanks(countries, tab)) {
      badges.set(`${login}${kind.suffix}`, ranked(rank, title, kind.label));
      if (!home.has(login)) home.set(login, title);
    }
  }
  for (const row of worldRanking(countries, worldTopN, automated)) {
    const login = checkLogin(row.login, "the world ranking");
    badges.set(`${login}${WORLD_BADGE.suffix}`, ranked(row.rank, WORLD_BADGE.place, WORLD_BADGE.label));
  }
  for (const [login, title] of home) {
    for (const kind of Object.values(BADGE_KINDS)) {
      const name = `${login}${kind.suffix}`;
      if (!badges.has(name)) badges.set(name, unranked(title, kind.label));
    }
    const world = `${login}${WORLD_BADGE.suffix}`;
    if (!badges.has(world)) badges.set(world, unranked(WORLD_BADGE.place, WORLD_BADGE.label));
  }
  return badges;
}
