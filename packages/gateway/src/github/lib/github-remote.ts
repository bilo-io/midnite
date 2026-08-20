// Normalising a git remote URL to an `owner/repo` slug — the join key that matches a
// GitHub repository to a checkout already on disk (Phase 84 Theme B, Decision §2).
//
// Pure and side-effect-free so the whole matrix of remote spellings is unit-testable
// without a filesystem or a git binary.

/** Hosts we recognise as github.com. GitHub Enterprise Server is out of scope (§9). */
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com', 'ssh.github.com']);

/**
 * Normalise a git remote URL to `owner/repo`, or `null` when it isn't a github.com
 * remote we understand. Handles every spelling `git remote -v` realistically emits:
 *
 * - `git@github.com:owner/repo.git` (scp-like, the clone default for SSH)
 * - `ssh://git@github.com/owner/repo.git` · `ssh://git@ssh.github.com:443/owner/repo`
 * - `https://github.com/owner/repo.git` · with a `user:token@` credential prefix
 * - `git://github.com/owner/repo`
 *
 * A trailing `.git`, a trailing slash, and surrounding whitespace are all stripped.
 * Case is preserved (GitHub slugs are case-insensitive but display-cased) — callers
 * that need a lookup key should lower-case it themselves via {@link ownerRepoKey}.
 */
export function normalizeGitRemote(remote: string): string | null {
  const raw = remote.trim();
  if (!raw) return null;

  // scp-like syntax (`git@github.com:owner/repo.git`) is not a URL, so it has to be
  // matched before handing anything to the URL parser.
  const scp = /^(?:[^@/\s]+@)?([^:/\s]+):(?!\/)(.+)$/.exec(raw);
  if (scp) {
    const [, host, path] = scp;
    if (!isGithubHost(host!)) return null;
    return slugFromPath(path!);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!['http:', 'https:', 'ssh:', 'git:'].includes(url.protocol)) return null;
  if (!isGithubHost(url.hostname)) return null;
  return slugFromPath(url.pathname);
}

/** Case-folded lookup key for an `owner/repo` slug — GitHub treats them case-insensitively. */
export function ownerRepoKey(ownerRepo: string): string {
  return ownerRepo.toLowerCase();
}

function isGithubHost(host: string): boolean {
  return GITHUB_HOSTS.has(host.toLowerCase());
}

/** `/owner/repo.git/` → `owner/repo`; anything that isn't exactly two segments → null. */
function slugFromPath(path: string): string | null {
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  const withoutSuffix = trimmed.replace(/\.git$/i, '');
  const segments = withoutSuffix.split('/').filter((s) => s.length > 0);
  if (segments.length !== 2) return null;
  const [owner, repo] = segments;
  if (!owner || !repo) return null;
  return `${owner}/${repo}`;
}

/**
 * Extract a remote's URL from the text of a `.git/config` file.
 *
 * Reading the config directly (rather than shelling out to `git remote get-url` per
 * candidate directory) keeps a scan over a root holding dozens of checkouts to one
 * cheap read each — the decision recorded for this theme.
 *
 * Prefers `origin`, then `upstream`, then the first remote in the file, so a fork
 * whose `origin` points at your own copy still matches on `origin` (which is what you
 * cloned and what you'd push to) while a checkout with an oddly-named sole remote
 * still resolves. Section headers are matched loosely to tolerate the tab/space
 * indentation git writes and the quoting variants it accepts.
 */
export function parseGitConfigRemotes(configText: string): Map<string, string> {
  const remotes = new Map<string, string>();
  let current: string | null = null;
  for (const line of configText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const section = /^\[\s*remote\s+"([^"]+)"\s*\]$/.exec(trimmed);
    if (section) {
      current = section[1] ?? null;
      continue;
    }
    if (trimmed.startsWith('[')) {
      current = null; // some other section — stop attributing `url =` lines to a remote
      continue;
    }
    if (!current) continue;
    const kv = /^url\s*=\s*(.+)$/.exec(trimmed);
    if (kv && !remotes.has(current)) remotes.set(current, kv[1]!.trim());
  }
  return remotes;
}

/** The remote we treat as authoritative: `origin` → `upstream` → first declared. */
export function pickRemoteUrl(remotes: Map<string, string>): string | undefined {
  return remotes.get('origin') ?? remotes.get('upstream') ?? remotes.values().next().value;
}
