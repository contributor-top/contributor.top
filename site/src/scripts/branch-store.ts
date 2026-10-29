// A working copy of one data branch (data, optout) in its own directory, written by the collector.
// The token never appears in argv or in the remote URL: git gets it through GIT_CONFIG_* variables.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type Identity = { name: string; email: string };

export class BranchStore {
  constructor(
    readonly dir: string,
    private readonly branch: string,
    private readonly repo: string,
    private readonly token: (() => Promise<string>) | null,
    private readonly identity: Identity | null,
  ) {}

  private async env(): Promise<NodeJS.ProcessEnv> {
    const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
    if (this.identity) {
      Object.assign(env, {
        GIT_AUTHOR_NAME: this.identity.name,
        GIT_AUTHOR_EMAIL: this.identity.email,
        GIT_COMMITTER_NAME: this.identity.name,
        GIT_COMMITTER_EMAIL: this.identity.email,
      });
    }
    if (this.token) {
      const token = await this.token();
      if (process.env["GITHUB_ACTIONS"] === "true") console.log(`::add-mask::${token}`);
      const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
      Object.assign(env, {
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
      });
    }
    return env;
  }

  private async git(args: string[], quietFailure = false): Promise<boolean> {
    try {
      execFileSync("git", ["-C", this.dir, ...args], {
        env: await this.env(),
        stdio: quietFailure ? "ignore" : "inherit",
      });
      return true;
    } catch (e) {
      if (quietFailure) return false;
      throw e;
    }
  }

  /** Checks out the branch, or starts it as an orphan when it does not exist yet. */
  async prepare(): Promise<void> {
    if (!existsSync(join(this.dir, ".git"))) {
      mkdirSync(this.dir, { recursive: true });
      await this.git(["init", "-q"]);
      await this.git(["remote", "add", "origin", `https://github.com/${this.repo}.git`]);
    }
    if (await this.git(["fetch", "-q", "--depth=1", "origin", this.branch], true)) {
      await this.git(["checkout", "-q", "-B", this.branch, "FETCH_HEAD"]);
    } else {
      await this.git(["checkout", "-q", "--orphan", this.branch]);
    }
  }

  /** Commits everything in the directory; returns false when nothing changed. */
  async commit(message: string): Promise<boolean> {
    await this.git(["add", "-A"]);
    if (await this.git(["diff", "--cached", "--quiet"], true)) return false;
    await this.git(["commit", "-q", "-m", message]);
    return true;
  }

  /** Pushes; if someone else pushed meanwhile (optout-manual), rebases onto it and tries again. */
  async push(): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.git(["push", "-q", "origin", `HEAD:refs/heads/${this.branch}`], true)) return;
      await this.git(["pull", "-q", "--rebase", "--depth=50", "origin", this.branch], true);
    }
    throw new Error(`could not push to ${this.branch}`);
  }
}
