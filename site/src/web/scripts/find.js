// /find/?login=…&tab=… (badge links): opens that person's row in their best country ranking, or in the world
// ranking with tab=world. Inline in <head>, ahead of the stylesheet, so the lookup starts as soon as the page
// arrives instead of after the stylesheet and the bundled modules; the ranking then loads as a normal page, whose
// stylesheet is already cached.
(() => {
  // LOGIN and SLUG from src/collector/patterns.ts (a test keeps them equal): a plain script cannot import them.
  const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;
  const SLUG = /^[a-z][a-z0-9_]{1,40}$/;
  // Written by this page's own build: country titles to slugs, the sizes a ranking offers and where its fragments start.
  const data = JSON.parse(document.querySelector('meta[name="find-data"]')?.getAttribute("content") || "{}");
  const titles = data.slugs || {};
  const sizes = data.sizes || [];
  const steps = data.steps || [];
  // This page's language: its prefix ("" or "/ru") and texts.
  const base = typeof data.base === "string" ? data.base : "";
  const text = data.text || {};
  /** The size to open the ranking at: one that shows the row (no more rows load than that), or a larger saved one. */
  const sizeFor = (rank) => {
    const needed = sizes.find((s) => s >= rank) ?? sizes.at(-1) ?? 0;
    let saved = 0;
    try {
      saved = Number(localStorage.getItem("top"));
    } catch {}
    return sizes.includes(saved) && saved > needed ? saved : needed;
  };
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
      status.textContent = `${text.notFound || ""} `;
      const link = document.createElement("a");
      link.href = `${base}/methodology/`;
      link.textContent = text.see || "";
      status.append(link);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show, { once: true });
    else show();
  };
  const params = new URLSearchParams(location.search);
  const login = params.get("login") || "";
  const asked = params.get("tab") || "public";
  const tabName = Object.hasOwn(TABS, asked) ? asked : "public";
  const tab = TABS[tabName];
  if (!LOGIN.test(login)) return notFound();
  const name = login.toLowerCase();
  fetch(`/u/${encodeURIComponent(name)}${tab.suffix}.json`)
    .then((res) => (res.ok ? res.json() : null))
    .then((badge) => {
      // "#17 Atlantis (public contributions)"; "Atlantis: unranked (…)" is a file too, but not a rank.
      const ranked = String(badge?.message ?? "").match(/^#\d+\s+(.+?)\s+\([^()]*\)$/);
      if (!ranked) return notFound();
      // The place ("#17 …") picks the size, so the ranking loads its rows down to this one and no further.
      const size = sizeFor(Number.parseInt(String(badge.message).slice(1), 10));
      /**
       * Opens the ranking at that size. The steps of rows it needs beyond the first (pages/rows) start loading now,
       * alongside the page, instead of once the page has arrived: a prefetch outlives this page.
       */
      const open = (rows, page) => {
        for (const start of steps.filter((s) => s < size)) {
          const link = document.createElement("link");
          link.rel = "prefetch";
          link.href = `/rows/${rows}/${start + 1}/`;
          document.head.append(link);
        }
        location.replace(`${base}${page}?top=${size}#${name}`);
      };
      // The world has one page: the badge's place is never looked up as a country.
      if (tabName === "world") return open("world", "/world/");
      const slug = titles[ranked[1] ?? ""];
      // Slugs come from validated presets, so this stays a same-site path.
      if (slug && SLUG.test(slug)) open(`${slug}/${tabName}`, `/${slug}/${tab.path}`);
      else notFound();
    })
    .catch(notFound);
})();
