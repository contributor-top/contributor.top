// One-time setup of the collector's credentials, run by a maintainer in site/: npm run setup-collector
//
// 1. Creates the collector GitHub App from a manifest: open the printed local URL and press the button; GitHub
//    redirects back with a one-time code, exchanged here for the App's ID and private key. The key goes straight
//    into the `collector` environment (secret COLLECTOR_APP_KEY, variable COLLECTOR_APP_ID); it is never printed.
// 2. Creates OPTOUT_KEY if the environment has none, and writes one backup copy to OPTOUT_KEY_BACKUP
//    (default ~/Downloads/contributors-top-OPTOUT_KEY.txt): move it to a password manager and delete the file.
//    Losing the key would make the opt-out list unreadable.
// Needs `gh` logged in with admin rights on the repository and `npm run setup-repo -- --apply` done first.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../collector/config.ts";

const repo = loadConfig().site.repo;
const [org] = repo.split("/");
const PORT = 8765;
const ENV = ["--env", "collector", "--repo", repo];

const gh = (args: string[], input?: string) =>
  execFileSync("gh", args, { encoding: "utf8", ...(input === undefined ? {} : { input }) });

// ---- OPTOUT_KEY
const secrets = gh(["secret", "list", ...ENV, "--json", "name", "--jq", ".[].name"]).split("\n");
if (secrets.includes("OPTOUT_KEY")) {
  console.log("OPTOUT_KEY already set; left unchanged.");
} else {
  const key = randomBytes(32).toString("base64");
  const backup = process.env["OPTOUT_KEY_BACKUP"] || join(homedir(), "Downloads", "contributors-top-OPTOUT_KEY.txt");
  if (existsSync(backup)) throw new Error(`${backup} already exists; move it away first`);
  writeFileSync(backup, `${key}\n`, { mode: 0o600 });
  gh(["secret", "set", "OPTOUT_KEY", ...ENV], key);
  console.log(`OPTOUT_KEY set. Backup written to ${backup}: move it to a password manager, then delete the file.`);
}

// ---- GitHub App from a manifest
if (
  gh(["variable", "list", ...ENV, "--json", "name", "--jq", ".[].name"])
    .split("\n")
    .includes("COLLECTOR_APP_ID")
) {
  console.log("COLLECTOR_APP_ID already set; the App exists. Nothing else to do.");
  process.exit(0);
}

const state = randomBytes(16).toString("hex");
const manifest = {
  name: "contributors-top-collector",
  url: "https://contributors.top",
  description: "Collects public contribution counts for contributors.top and publishes the data branch.",
  hook_attributes: { url: "https://contributors.top", active: false },
  redirect_url: `http://127.0.0.1:${PORT}/callback`,
  public: false,
  // contents: push the data and optout branches; actions: trigger the deploy workflow.
  default_permissions: { contents: "write", actions: "write", metadata: "read" },
  default_events: [],
};
const attr = (s: string) => s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const page = (body: string) => `<!doctype html><meta charset="utf-8"><title>contributors.top setup</title>
<body style="font:16px system-ui;max-width:40rem;margin:4rem auto">${body}</body>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      page(`<h1>Create the collector App</h1>
<p>Permissions: contents (write), actions (write), metadata (read). No webhooks.</p>
<form method="post" action="https://github.com/organizations/${org}/settings/apps/new?state=${state}">
<input type="hidden" name="manifest" value="${attr(JSON.stringify(manifest))}">
<button style="font-size:1.1rem;padding:.6rem 1.2rem">Create on GitHub</button></form>`),
    );
    return;
  }
  if (url.pathname !== "/callback" || url.searchParams.get("state") !== state) {
    res.writeHead(404).end();
    return;
  }
  try {
    const code = url.searchParams.get("code") ?? "";
    if (!/^[A-Za-z0-9]+$/.test(code)) throw new Error("unexpected code");
    const response = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: "POST",
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
    if (response.status !== 201) throw new Error(`manifest conversion returned ${response.status}`);
    const app = (await response.json()) as { id: number; slug: string; pem: string };
    gh(["secret", "set", "COLLECTOR_APP_KEY", ...ENV], app.pem);
    gh(["variable", "set", "COLLECTOR_APP_ID", ...ENV, "--body", String(app.id)]);
    const install = `https://github.com/apps/${app.slug}/installations/new`;
    res
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(page(`<h1>Done</h1><p>Now install the App on <b>${repo}</b> only: <a href="${install}">${install}</a></p>`));
    console.log(`App ${app.slug} created; ID and key stored in the collector environment.`);
    console.log(`Install it on ${repo} only: ${install}`);
  } catch (e) {
    res.writeHead(500).end(page(`<h1>Failed</h1><p>${attr(e instanceof Error ? e.message : String(e))}</p>`));
    console.error(e);
    process.exitCode = 1;
  }
  server.close();
});
server.listen(PORT, "127.0.0.1", () => console.log(`Open http://127.0.0.1:${PORT}/ and press "Create on GitHub".`));
