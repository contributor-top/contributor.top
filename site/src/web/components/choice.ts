// A select-only combobox (the WAI-ARIA pattern): a button that shows the chosen option and opens a list under it,
// drawn like the language menu rather than by the browser. Like a <select>, the button holds the value
// (button.value) and fires "change" when the visitor picks another option.

/** The options of a choice button, in order. */
function optionsOf(button: HTMLButtonElement): HTMLElement[] {
  const list = document.getElementById(button.getAttribute("aria-controls") ?? "");
  return list ? [...list.querySelectorAll<HTMLElement>("[role=option]")] : [];
}

/** Shows `value` as the chosen one, if it is one of the options; false when it is not. Fires no "change". */
export function choose(button: HTMLButtonElement, value: string): boolean {
  const options = optionsOf(button);
  if (!options.some((option) => option.dataset["value"] === value)) return false;
  for (const option of options) option.setAttribute("aria-selected", String(option.dataset["value"] === value));
  // Every label sits in the button, stacked, so it is always as wide as the widest; only the chosen one is visible.
  for (const label of button.querySelectorAll<HTMLElement>("[data-value]")) {
    label.toggleAttribute("data-current", label.dataset["value"] === value);
  }
  button.value = value;
  return true;
}

function close(button: HTMLButtonElement): void {
  const list = document.getElementById(button.getAttribute("aria-controls") ?? "");
  if (list) list.hidden = true;
  button.setAttribute("aria-expanded", "false");
  button.removeAttribute("aria-activedescendant");
}

function wire(button: HTMLButtonElement): void {
  const list = document.getElementById(button.getAttribute("aria-controls") ?? "");
  const options = optionsOf(button);
  if (!list || options.length === 0) return;
  let active = 0;
  let typed = "";
  let typedAt = 0;

  const isOpen = () => !list.hidden;
  const selected = () =>
    Math.max(
      0,
      options.findIndex((option) => option.dataset["value"] === button.value),
    );
  const highlight = (index: number) => {
    active = Math.min(options.length - 1, Math.max(0, index));
    for (const [i, option] of options.entries()) option.classList.toggle("active", i === active);
    button.setAttribute("aria-activedescendant", options[active]?.id ?? "");
  };
  const open = (index = selected()) => {
    list.hidden = false;
    button.setAttribute("aria-expanded", "true");
    highlight(index);
    // On a short screen the list may open below the fold: bring it in, without moving the page when it fits.
    list.scrollIntoView({ block: "nearest" });
  };
  const pick = (index: number) => {
    const value = options[index]?.dataset["value"] ?? "";
    close(button);
    if (value !== button.value && choose(button, value)) button.dispatchEvent(new Event("change", { bubbles: true }));
  };
  // Typing jumps to the next option starting with the typed letters, like a <select>.
  const typeahead = (key: string) => {
    const now = Date.now();
    typed = now - typedAt > 600 ? key : typed + key;
    typedAt = now;
    const from = typed.length === 1 ? active + 1 : active;
    const order = options.map((_, i) => (from + i) % options.length);
    const match = order.find((i) => options[i]?.textContent?.trim().toLowerCase().startsWith(typed.toLowerCase()));
    if (match !== undefined) (isOpen() ? highlight : open)(match);
  };

  button.addEventListener("click", () => {
    button.focus();
    if (isOpen()) close(button);
    else open();
  });
  // The keys of the WAI-ARIA select-only combobox; each returns false for a key it leaves to the browser.
  const whenClosed = (key: string): boolean => {
    if (key === "Home") open(0);
    else if (key === "End") open(options.length - 1);
    else if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) open();
    else return false;
    return true;
  };
  const whenOpen = (event: KeyboardEvent): boolean => {
    const moves: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowUp: active - 1,
      Home: 0,
      End: options.length - 1,
      PageDown: active + 10,
      PageUp: active - 10,
    };
    const { key } = event;
    if (key === "Enter" || key === " " || (key === "ArrowUp" && event.altKey)) pick(active);
    else if (key === "Escape") close(button);
    else if (key in moves) highlight(moves[key] ?? active);
    else return false;
    return true;
  };
  button.addEventListener("keydown", (event) => {
    const { key } = event;
    if (key === "Tab") return close(button);
    const letter = key.length === 1 && key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey;
    if (letter) typeahead(key);
    if (letter || (isOpen() ? whenOpen(event) : whenClosed(key))) event.preventDefault();
  });
  // Firefox presses a button on Space's keyup, after the keydown above has already handled it.
  button.addEventListener("keyup", (event) => event.key === " " && event.preventDefault());
  // Keep the focus on the button while the list is used with a pointer.
  list.addEventListener("pointerdown", (event) => event.preventDefault());
  list.addEventListener("pointermove", (event) => {
    const option = (event.target as Element).closest<HTMLElement>("[role=option]");
    if (option) highlight(options.indexOf(option));
  });
  list.addEventListener("click", (event) => {
    const option = (event.target as Element).closest<HTMLElement>("[role=option]");
    if (option) pick(options.indexOf(option));
  });
}

/** Wires every choice on the page; runs on each page load, the router swaps the page instead of reloading it. */
export function wireChoices(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-choice]:not([data-wired])")) {
    button.toggleAttribute("data-wired", true);
    wire(button);
  }
}

// A press anywhere else closes an open list: pointerdown, since iOS sends no click from plain text. The button's own
// <label> counts as part of it, so pressing the label toggles the list like pressing the button.
document.addEventListener("pointerdown", (event) => {
  const target = event.target as Node;
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-choice][aria-expanded=true]")) {
    const list = document.getElementById(button.getAttribute("aria-controls") ?? "");
    const inside = [button, list, ...(button.labels ?? [])].some((part) => part?.contains(target));
    if (!inside) close(button);
  }
});
