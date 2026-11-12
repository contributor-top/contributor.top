// The ranking table: the top-size switch, the rows after the first ones, and the row a link points to (#login, e.g.
// from a badge). Inline right after the table, so on a full page load it runs before the first paint: the page
// appears already scrolled to the linked row, marked, with the chosen number of rows, instead of at the top and then
// jumping once the bundled modules arrive. The client router runs it again after every page switch
// (data-astro-rerun).
//
// The page carries the default size; a smaller chosen one hides the rows past it. Further rows are static fragments,
// one per step between the larger sizes (data-more, data-starts), inserted only when the chosen size or a #login link
// needs them; ranking-early.js has usually fetched them already.
(() => {
  // LOGIN from src/collector/patterns.ts (a test keeps them equal): a plain script cannot import it.
  const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

  /** The #login of the address, lowercase, or null when there is none or it is malformed. */
  const linkedLogin = () => {
    try {
      const id = decodeURIComponent(location.hash.slice(1)).toLowerCase();
      return LOGIN.test(id) ? id : null;
    } catch {
      return null;
    }
  };

  const numbers = (text) =>
    (text ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((n) => n >= 0);

  /** A message with its {placeholders} replaced by the numbers, written the language's way. */
  const fill = (text, vars, number) => {
    let label = text;
    for (const [name, value] of Object.entries(vars)) label = label.replaceAll(`{${name}}`, number.format(value));
    return label;
  };

  /**
   * Puts rows into the page's language. Fragments are built once, in English, for every language; a page in another
   * one says how to translate them (data-i18n: its locale, the row messages and the country names). A number alone
   * (data-n) is shown in the language; a tooltip (data-k) gets its message, with data-n and the numbers of data-v.
   */
  const translate = (words, rows) => {
    const number = new Intl.NumberFormat(words.locale);
    const plural = new Intl.PluralRules(words.locale);
    for (const el of rows.querySelectorAll("[data-n], [data-k]")) {
      const n = Number(el.dataset.n);
      const forms = el.dataset.k && words.messages[el.dataset.k];
      if (!forms) el.textContent = number.format(n);
      else {
        const text = typeof forms === "string" ? forms : (forms[plural.select(n)] ?? forms.other);
        el.setAttribute("aria-label", fill(text, { n, ...JSON.parse(el.dataset.v ?? "{}") }, number));
      }
    }
    for (const el of rows.querySelectorAll(".country")) {
      el.textContent = words.countries?.[el.textContent] ?? el.textContent;
    }
  };

  /** Appends a fragment's rows, translated first on a page that is not in English. */
  const insertRows = (table, rows) => {
    const body = table.tBodies[0];
    if (!body) return;
    const template = document.createElement("template");
    template.innerHTML = rows;
    if (table.dataset.i18n) translate(JSON.parse(table.dataset.i18n), template.content);
    body.append(template.content);
  };

  /**
   * Inserts the steps of rows that start below `upTo`, in order, each once. A step fetched by ranking-early.js is
   * taken from there; a step that cannot be loaded is skipped (the rows above it stay usable).
   */
  const loadUpTo = (table, upTo) => {
    const more = table.dataset.more;
    if (!more) return Promise.resolve();
    const early = window.rankingRows?.more === more ? window.rankingRows.steps : new Map();
    table.inserted ??= new Set();
    table.queue ??= Promise.resolve();
    for (const start of numbers(table.dataset.starts)) {
      if (start >= upTo || table.inserted.has(start)) continue;
      table.inserted.add(start);
      const html =
        early.get(start) ??
        fetch(`${more}${start + 1}/`)
          .then((res) => (res.ok ? res.text() : ""))
          .catch(() => "");
      // Same-site static files built from the same rows as this page: rows only, no scripts.
      table.queue = table.queue.then(() => html).then((rows) => insertRows(table, rows));
    }
    return table.queue;
  };

  /** Marks the linked row (case-insensitive, unlike :target, and also after a client-side navigation). */
  const markTarget = (table) => {
    for (const row of table.querySelectorAll("tr.is-target")) row.classList.remove("is-target");
    const id = linkedLogin();
    const row = id ? table.querySelector(`tbody tr[id="${id}"]`) : null;
    row?.classList.add("is-target");
    return row;
  };

  /** Shows the first `top` rows, loading the steps they need, and marks the size as chosen. */
  const show = (table, top) => {
    const pick = () => {
      for (const row of table.querySelectorAll("tbody tr[data-rank]")) row.hidden = Number(row.dataset.rank) > top;
    };
    for (const b of document.querySelectorAll("[data-top-switch] button")) {
      b.setAttribute("aria-pressed", String(Number(b.dataset.topValue) === top));
    }
    pick();
    return loadUpTo(table, top).then(pick);
  };

  /** The size to show: from ?top=, then the last choice, then the default; large enough for the linked row. */
  const sizeFor = (table, target) => {
    const choices = numbers(table.dataset.choices);
    let top = Number(new URLSearchParams(location.search).get("top"));
    if (!choices.includes(top)) {
      try {
        top = Number(localStorage.getItem("top"));
      } catch {}
    }
    if (!choices.includes(top)) top = Number(table.dataset.top);
    const rank = Number(target?.dataset.rank);
    return rank > top ? (choices.find((c) => c >= rank) ?? top) : top;
  };

  /** Shows the table again (a #login link keeps it hidden until its row is in place: html.to-row). */
  const reveal = () => document.documentElement.classList.remove("to-row");

  /** Shows the chosen size and brings the linked row, loading the step it is in, to the middle of the screen. */
  const settle = (table) =>
    show(table, sizeFor(table, markTarget(table))).then(() => {
      const target = markTarget(table);
      // In a step that came in just now, below the size shown: once more, with a size that includes it.
      if (target?.hidden) return settle(table);
      if (!target) {
        // Not in the rows of the chosen size: it can only be in a step not loaded yet.
        const loaded = numbers(table.dataset.starts).every((start) => table.inserted?.has(start));
        if (linkedLogin() && !loaded) return loadUpTo(table, Number.POSITIVE_INFINITY).then(() => settle(table));
        return;
      }
      target.scrollIntoView({ block: "start" });
      // The router restores the scroll position it saved in history.state (on a reload, after this ran): save the
      // linked row's, so a reload of a #login link lands where a fresh visit does instead of jumping elsewhere.
      if (history.state) history.replaceState({ ...history.state, scrollX, scrollY }, "");
    });

  // The table is parsed: ranking-early.js no longer needs to hide rows past a smaller size as they arrive.
  window.rankingRows?.hide?.disconnect();
  const table = document.querySelector("table.ranking");
  if (!table) return reveal();
  for (const b of document.querySelectorAll("[data-top-switch] button")) {
    b.addEventListener("click", () => {
      const top = Number(b.dataset.topValue);
      show(table, top);
      const url = new URL(location.href);
      url.searchParams.set("top", String(top));
      history.replaceState(history.state, "", url);
      try {
        localStorage.setItem("top", String(top));
      } catch {}
    });
  }
  settle(table).finally(reveal);

  // Same page, new #login (a typed or followed hash link): move the mark there. Once per document: the router
  // keeps the window across page switches, and the handler looks up the table of the current page.
  if (!window.rankingHashChange) {
    window.rankingHashChange = () => {
      const current = document.querySelector("table.ranking");
      if (current) settle(current);
    };
    window.addEventListener("hashchange", window.rankingHashChange);
  }
})();
