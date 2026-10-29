import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildBadges } from "../collector/badges.ts";
import { type CountryData, countryDataSchema } from "../collector/country-data.ts";
import { displayTitle, presetSchema } from "../collector/preset.ts";
import { jsonForScript } from "../collector/safe-json.ts";

const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

describe("jsonForScript", () => {
  it("cannot close a script element or open an HTML comment", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.string(), (value, extra) => {
        const out = jsonForScript({ value, extra: `${extra}</script><!--${LS}${PS}` });
        for (const ch of ["<", ">", "&", LS, PS]) expect(out.includes(ch)).toBe(false);
        expect(JSON.parse(out)).toEqual(
          JSON.parse(JSON.stringify({ value, extra: `${extra}</script><!--${LS}${PS}` })),
        );
      }),
    );
  });
});

describe("display titles", () => {
  it("reject markup and script-breaking characters", () => {
    for (const bad of ["</script><script>alert(1)</script>", 'A"B', "A&B", "A/B", "`x`", "x<y"]) {
      expect(displayTitle.safeParse(bad).success).toBe(false);
    }
    for (const good of ["Côte d'Ivoire", "Congo (Kinshasa)", "Guinea-Bissau", "Timor-Leste", "São Tomé"]) {
      expect(displayTitle.safeParse(good).success).toBe(true);
    }
  });

  it("apply to presets and to published country data", () => {
    const preset = { title: "<b>x</b>", iso: null, include: ["xx"], exclude: [] };
    expect(presetSchema.safeParse(preset).success).toBe(false);
    const data = {
      slug: "x_land",
      title: "<img src=x onerror=alert(1)>",
      updatedAt: "2026-10-28T12:00:00.000Z",
      totalUsers: 0,
      considered: 0,
      minFollowers: 0,
      tabs: { public: [], all: [], commits: [] },
      breakdown: {},
    };
    expect(countryDataSchema.safeParse(data).success).toBe(false);
    expect(countryDataSchema.safeParse({ ...data, title: "X Land", slug: "../etc" }).success).toBe(false);
  });
});

describe("badge file names", () => {
  it("refuse a login that could escape the badge directory", () => {
    const country = (login: string): CountryData => ({
      slug: "x_land",
      title: "X Land",
      updatedAt: "2026-10-28T12:00:00.000Z",
      totalUsers: 1,
      considered: 1,
      minFollowers: 0,
      tabs: { public: [{ rank: 1, login, id: 1, contributions: 1 }], all: [], commits: [] },
      breakdown: {},
    });
    for (const login of ["../../etc/passwd", "a/b", "a\\b", ".hidden", "-x", ""]) {
      expect(() => buildBadges([country(login)])).toThrow(/invalid login/);
    }
    expect(buildBadges([country("Octo-Cat")]).has("octo-cat")).toBe(true);
  });
});
