// In <head>, ahead of the stylesheet: starts fetching the steps of rows the chosen size needs as soon as the page
// arrives, so they are usually in by the time the table is parsed; ranking.js inserts them. Nothing is fetched for
// the sizes the page carries itself (up to the default), and nothing beyond the chosen one: a #login link further
// down loads the rest only once ranking.js finds its row missing (badge links come with a ?top= that covers their
// row). With a #login link the table stays hidden until its row is placed (html.to-row, global.css), so it never
// shows at the top and then jumps. With a size below the default, the rows past it, which the page carries, are
// hidden as they are parsed: a page arrives in pieces and may be painted before ranking.js runs after the table.
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
  // Observer callbacks run before the browser renders, so no frame shows these rows; ranking.js disconnects it.
  const hide =
    top < byDefault
      ? new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) if (Number(node.dataset?.rank) > top) node.hidden = true;
          }
        })
      : null;
  hide?.observe(document.documentElement, { childList: true, subtree: true });
  const fetchStep = (start) =>
    fetch(`${more}${start + 1}/`)
      .then((res) => (res.ok ? res.text() : ""))
      .catch(() => "");
  window.rankingRows = {
    more,
    hide,
    steps: new Map(starts.filter((start) => start < top).map((start) => [start, fetchStep(start)])),
  };
})();
