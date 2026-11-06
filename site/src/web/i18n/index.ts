// Translations. One JSON file per language in this folder, named by its URL prefix (ru.json serves /ru/…); English
// (en.json) is the source and serves the site's root. Methodology and Privacy are Markdown files in docs/<language>/.
// Adding a language is adding those three files: astro.config.mjs builds every page for it.
//
// A message is a string with {placeholders}, or an object of plural forms (Intl.PluralRules categories: one, few,
// many, other…) chosen by {n}. Numbers are formatted for the language; a placeholder without a value stays as it is,
// so a page can put a link or <code> there (see parts()).
import en from "./en.json";

export type Key = keyof typeof en;
type Message = string | Record<string, string>;
type Vars = Record<string, string | number>;

const files = import.meta.glob<Record<string, Message>>("./*.json", { eager: true, import: "default" });
const dictionaries = new Map(Object.entries(files).map(([path, dict]) => [path.slice(2, -5), dict]));

export const DEFAULT_LANG = "en";
/** Every language: English first, then by code. */
export const LANGS = [...dictionaries.keys()].sort((a, b) =>
  a === DEFAULT_LANG ? -1 : b === DEFAULT_LANG ? 1 : a.localeCompare(b),
);

const dictionary = (lang: string): Record<string, Message> => dictionaries.get(lang) ?? en;
/** The language's name in itself ("Deutsch"), for the language switcher. */
export const nameOf = (lang: string): string => String(dictionary(lang)["lang.name"]);
/** BCP 47 code for <html lang> and hreflang ("pt-BR", "zh-Hans"). */
export const codeOf = (lang: string): string => String(dictionary(lang)["lang.code"]);
/** Where a language's pages live: "" for English, "/ru" for Russian. */
export const prefixOf = (lang: string): string => (lang === DEFAULT_LANG ? "" : `/${lang}`);

/** A path without its language prefix: "/ru/belarus/" → "/belarus/". */
export const unprefixed = (path: string): string => {
  const first = path.split("/")[1] ?? "";
  return first !== DEFAULT_LANG && dictionaries.has(first) ? path.slice(first.length + 1) || "/" : path;
};

/** Splits a message on its remaining placeholders: "See {link}." → ["See ", "{link}", "."]. */
export const parts = (message: string): string[] => message.split(/(\{\w+\})/).filter(Boolean);

const made = new Map<string, I18n>();
/** Everything a page needs to speak one language: made once per language (every component of every page asks). */
export function i18n(lang: string | undefined): I18n {
  const current = lang && dictionaries.has(lang) ? lang : DEFAULT_LANG;
  const tools = made.get(current) ?? make(current);
  made.set(current, tools);
  return tools;
}

function make(current: string) {
  const dict = dictionary(current);
  const code = codeOf(current);
  // English keeps the site's day-month-year dates ("28 Oct 2026").
  const locale = current === DEFAULT_LANG ? "en-GB" : code;
  const plural = new Intl.PluralRules(locale);
  const number = new Intl.NumberFormat(locale);
  const regions = new Intl.DisplayNames([locale], { type: "region", fallback: "none" });
  const dateTime = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  /** The message for `key` (English if a translation lacks it), with its placeholders filled in. */
  const t = (key: Key, vars: Vars = {}): string => {
    const message: Message = dict[key] ?? en[key];
    const text =
      typeof message === "string" ? message : (message[plural.select(Number(vars["n"]))] ?? message["other"] ?? "");
    return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = vars[name];
      return value === undefined ? whole : typeof value === "number" ? number.format(value) : value;
    });
  };

  return {
    lang: current,
    code,
    locale,
    t,
    /** The same page in this language: "/belarus/" → "/ru/belarus/". */
    href: (path: string) => prefixOf(current) + path,
    number: (n: number) => number.format(n),
    dateTime: (iso: string) => `${dateTime.format(new Date(iso))} UTC`,
    day: (iso: string) => day.format(new Date(iso)),
    /** A country's name: the preset's title in English, the ISO name in other languages ("Беларусь"). */
    country: (entry: { title: string; iso: string | null }) =>
      current === DEFAULT_LANG || !entry.iso ? entry.title : (regions.of(entry.iso) ?? entry.title),
    /** The plural forms of a message, for the browser (ranking.js localizes the rows it inserts). */
    forms: (key: Key): Message => dict[key] ?? en[key],
  };
}

export type I18n = ReturnType<typeof make>;
