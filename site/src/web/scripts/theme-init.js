// Before the first paint and again after every client-side navigation (which replaces <html>'s attributes):
// the "js" class and the saved theme (light by default).
const applyTheme = () => {
  document.documentElement.classList.add("js");
  try {
    if (localStorage.getItem("theme") === "dark") document.documentElement.dataset.theme = "dark";
  } catch {}
};
applyTheme();
document.addEventListener("astro:after-swap", applyTheme);
