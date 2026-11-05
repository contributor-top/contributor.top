// tsc does not read .astro files (astro check does): what a .ts file importing a component, such as the row
// fragments' endpoint, gets from it.
declare module "*.astro" {
  const component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default component;
}
