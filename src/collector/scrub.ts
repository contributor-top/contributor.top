const REDACTED = "[redacted]";

/** Patterns in GitHub API errors that carry a login: (prefix)login(suffix). */
const PATTERNS: readonly RegExp[] = [
  /(login of ')[^']*(')/gi,
  /(user\(login: ?")[^"]*(")/gi,
  /(github\.com\/)[A-Za-z0-9-]+()/gi,
  /(avatars\.githubusercontent\.com\/)[A-Za-z0-9-]+()/gi,
];

/**
 * Removes logins from text before it reaches public Actions logs or job summaries.
 * Known logins are redacted as whole words; known API error shapes are redacted by pattern.
 */
export function scrub(text: string, knownLogins: Iterable<string> = []): string {
  let out = text;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, (_m, before: string, after: string) => `${before}${REDACTED}${after}`);
  }
  for (const login of knownLogins) {
    if (login.length < 2) continue;
    const escaped = login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(?<![A-Za-z0-9-])${escaped}(?![A-Za-z0-9-])`, "gi"), REDACTED);
  }
  return out;
}
