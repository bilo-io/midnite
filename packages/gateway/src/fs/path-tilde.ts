import { homedir } from 'node:os';
import { join } from 'node:path';

// Paths are stored and exchanged in `~`-form so they stay portable if the home
// directory ever differs (different machine, different user). These are pure —
// `home` is injectable for testing; it defaults to the real home directory.

/** Collapse a leading home-directory prefix to `~`. Leaves other paths as-is. */
export function collapseTilde(absolutePath: string, home: string = homedir()): string {
  if (absolutePath === home) return '~';
  const prefix = home.endsWith('/') ? home : `${home}/`;
  if (absolutePath.startsWith(prefix)) return `~/${absolutePath.slice(prefix.length)}`;
  return absolutePath;
}

/** Expand a leading `~` back to the absolute home directory. Leaves other paths as-is. */
export function expandTilde(path: string, home: string = homedir()): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return join(home, path.slice(2));
  return path;
}
