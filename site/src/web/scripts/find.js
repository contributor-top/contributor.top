// /find/?login=…&tab=… (badge links): opens that person's row in their best country ranking, or in the world
// ranking with tab=world. Inline in <head>, ahead of the stylesheet, so the lookup starts as soon as the page
// arrives instead of after the stylesheet and the bundled modules; the ranking then loads as a normal page, whose
// stylesheet is already cached.
(() => {
  // LOGIN and SLUG from src/collector/patterns.ts (a test keeps them equal): a plain script cannot import them.
  const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
  const SLUG = /^[a-z][a-z0-9_]{1,40}$/;
  // Written by this page's own build: country titles to slugs.
  const titles = JSON.parse(document.querySelector('meta[name="find-data"]')?.getAttribute("content") || "{}");
  // Ranking → badge file suffix and page path; nothing outside these values ever reaches a URL.
  const TABS = {
    public: { suffix: "", path: "" },
    all: { suffix: ".all", path: "all/" },
    commits: { suffix: ".commits", path: "commits/" },
    world: { suffix: ".world", path: "" },
  };
  // The page body is not parsed yet when this runs: the message waits for it.
  const notFound = () => {
    const show = () => {
      const status = document.getElementById("status");
      if (!status) return;
      status.textContent = "This developer is not in this ranking yet. ";
      const link = document.createElement("a");
      link.href = "/methodology/";
      link.textContent = "See who is considered.";
      status.append(link);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
    else show();
  };
  const params = new URLSearchParams(location.search);
  const login = params.get("login") || "";
  const tabName = params.get("tab") || "public";
  const tab = Object.hasOwn(TABS, tabName) ? TABS[tabName] : TABS.public;
  if (!LOGIN.test(login)) return notFound();
  const name = login.toLowerCase();
  fetch(`/u/${encodeURIComponent(name)}${tab.suffix}.json`)
    .then((res) => (res.ok ? res.json() : null))
    .then((badge) => {
      // "#17 Atlantis (public contributions)"; "Atlantis: unranked (…)" is a file too, but not a rank.
      const ranked = String(badge?.message ?? "").match(/^#\d+\s+(.+?)\s+\([^()]*\)$/);
      if (!ranked) return notFound();
      // The world has one page: the badge's place is never looked up as a country.
      if (tabName === "world") return location.replace(`/world/#${name}`);
      const slug = titles[ranked[1] ?? ""];
      // Slugs come from validated presets, so this stays a same-site path.
      if (slug && SLUG.test(slug)) location.replace(`/${slug}/${tab.path}#${name}`);
      else notFound();
    })
    .catch(notFound);
})();
