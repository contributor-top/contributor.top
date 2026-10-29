// A working copy of one data branch (data, optout) in its own directory, written by the collector.
// The token never appears in argv or in the remote URL: git gets it through GIT_CONFIG_* variables.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type Identity = { name: string; email: string };

export class BranchStore {
  /** The commit the branch pointed to when the run started; null for a branch created by this run. */
  private startSha: string | null = null;
  /** Local commits not on GitHub yet: a failed push is retried with the next one instead of being forgotten. */
  private pending = false;

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

  /** Runs git and returns its exit code. */
  private async run(args: string[]): Promise<number> {
    try {
      execFileSync("git", ["-C", this.dir, ...args], { env: await this.env(), stdio: "ignore" });
      return 0;
    } catch (e) {
      return (e as { status?: number }).status ?? 1;
    }
  }

  private async git(args: string[]): Promise<void> {
    const code = await this.run(args);
    if (code !== 0) throw new Error(`git ${args[0]} failed (${code}) on ${this.branch}`);
  }

  private head(): string {
    return execFileSync("git", ["-C", this.dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  }

  /**
   * Checks out the branch, or starts it as an orphan only when GitHub says it does not exist.
   * Any other failure stops the run: starting from nothing would publish an empty opt-out list.
   */
  async prepare(): Promise<void> {
    if (!existsSync(join(this.dir, ".git"))) {
      mkdirSync(this.dir, { recursive: true });
      await this.git(["init", "-q"]);
      await this.git(["remote", "add", "origin", `https://github.com/${this.repo}.git`]);
    }
    const found = await this.run(["ls-remote", "--exit-code", "--heads", "origin", this.branch]);
    if (found === 2) {
      await this.git(["checkout", "-q", "--orphan", this.branch]);
      return;
    }
    if (found !== 0) throw new Error(`cannot read the ${this.branch} branch from GitHub`);
    await this.reset();
    this.startSha = this.head();
  }

  /** Makes the working copy exactly the branch on GitHub. */
  private async reset(): Promise<void> {
    await this.git(["fetch", "-q", "--depth=1", "origin", this.branch]);
    await this.git(["checkout", "-q", "-f", "-B", this.branch, "FETCH_HEAD"]);
    await this.git(["clean", "-q", "-fd"]);
  }

  /** Commits everything in the directory; returns false when nothing changed. */
  async commit(message: string): Promise<boolean> {
    await this.git(["add", "-A"]);
    if ((await this.run(["diff", "--cached", "--quiet"])) === 0) return false;
    await this.git(["commit", "-q", "-m", message]);
    this.pending = true;
    return true;
  }

  /**
   * Pushes pending commits. If someone else pushed meanwhile (a manual opt-out), the working copy is reset
   * to GitHub's version and `rewrite` writes this run's changes on top again; there is no rebase that could
   * stop half-way with conflict markers.
   */
  async push(rewrite: () => void, message: string): Promise<void> {
    for (let attempt = 0; this.pending && attempt < 3; attempt++) {
      if ((await this.run(["push", "-q", "origin", `HEAD:refs/heads/${this.branch}`])) === 0) {
        this.pending = false;
        return;
      }
      await this.reset();
      this.pending = false;
      rewrite();
      await this.commit(message);
    }
    if (this.pending) throw new Error(`could not push to ${this.branch}`);
  }

  /**
   * Replaces the branch history with one commit of its current files, so the repository does not grow by a
   * full snapshot per country update. The snapshot this run started from becomes `previous` for rollbacks,
   * unless `keepPrevious` is false (someone opted out: the old snapshot must not stay public).
   * --force-with-lease refuses to overwrite anything pushed by someone else meanwhile.
   */
  async squash(message: string, previous: string, keepPrevious: boolean): Promise<void> {
    const head = this.head();
    if (head === this.startSha) return; // nothing new in this run
    await this.git(["checkout", "-q", "--orphan", "squashed"]);
    await this.git(["commit", "-q", "-m", message]);
    const squashed = this.head();
    const prev = keepPrevious && this.startSha ? this.startSha : squashed;
    await this.git(["push", "-q", "--force", "origin", `${prev}:refs/heads/${previous}`]);
    await this.git([
      "push",
      "-q",
      `--force-with-lease=refs/heads/${this.branch}:${head}`,
      "origin",
      `HEAD:refs/heads/${this.branch}`,
    ]);
    await this.git(["branch", "-q", "-M", this.branch]);
    this.startSha = squashed;
  }
}
