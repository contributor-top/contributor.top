// In <head>, ahead of the stylesheet: starts fetching the steps of rows the chosen size needs as soon as the page
// arrives, so they are usually in by the time the table is parsed; ranking.js inserts them. Nothing is fetched for
// the smallest size, and nothing beyond the chosen one: a #login link further down loads the rest only once
// ranking.js finds its row missing (badge links come with a ?top= that covers their row). With a #login link the
// table stays hidden until its row is placed (html.to-row, global.css), so it never shows at the top and then jumps.
(() => {
  const meta = document.querySelector('meta[name="ranking"]');
  if (!meta) return;
  // Written by the page's own build: the fragments' base, where each starts, the sizes and the default one.
  const { more, starts, choices, top: byDefault } = JSON.parse(meta.getAttribute("content") || "{}");
  let top = Number(new URLSearchParams(location.search).get("top"));
  if (!choices.includes(top)) {
    try {
      top = Number(localStorage.getItem("top"));
    } catch {}
  }
  if (!choices.includes(top)) top = byDefault;
  if (location.hash.length > 1) document.documentElement.classList.add("to-row");
  const fetchStep = (start) =>
    fetch(`${more}${start + 1}/`)
      .then((res) => (res.ok ? res.text() : ""))
      .catch(() => "");
  window.rankingRows = {
    more,
    steps: new Map(starts.filter((start) => start < top).map((start) => [start, fetchStep(start)])),
  };
})();
