// Shared by the collector, the schemas and the pages' scripts. No imports, so a browser script can use it too.

/** GitHub logins: letters, digits and hyphens, up to 39 characters. Also used as file names and #anchors. */
export const LOGIN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/;

/** Country slugs, the preset file names: also used in paths and file names. */
export const SLUG = /^[a-z][a-z0-9_]{1,40}$/;
