import { Injectable } from '@nestjs/common';
import { mkdir, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { BrowseDirResponse, DirEntry } from '@midnite/shared';
import { collapseTilde, expandTilde } from './path-tilde';

/**
 * Read-only directory browser backing the web folder picker. Sessions spawn on
 * the gateway host, so the picker must navigate *this* machine's filesystem —
 * the browser can't surface real paths. Paths cross the wire in `~`-form.
 */
@Injectable()
export class FsService {
  /** List the immediate subdirectories of `path` (defaults to the home dir). */
  async browseDir(path?: string): Promise<BrowseDirResponse> {
    const home = homedir();
    const target = resolve(expandTilde((path ?? '').trim() || '~', home));

    const dirents = await readdir(target, { withFileTypes: true });
    const entries: DirEntry[] = dirents
      // Folders only (and symlinks, which may point at one); skip dotfiles to
      // keep the list to the directories people actually navigate to.
      .filter((d) => (d.isDirectory() || d.isSymbolicLink()) && !d.name.startsWith('.'))
      .map((d) => ({ name: d.name, path: collapseTilde(join(target, d.name), home) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentAbs = dirname(target);
    const parent = parentAbs === target ? null : collapseTilde(parentAbs, home);
    return { path: collapseTilde(target, home), parent, entries };
  }

  /**
   * Create `path` (recursively, like `mkdir -p`) and return its listing. Backs
   * the picker's "create folder" affordance when the user types a path that
   * doesn't exist yet. `mkdir` with `recursive: true` is idempotent, so
   * creating an existing directory is a no-op that simply lists it.
   */
  async createDir(path: string): Promise<BrowseDirResponse> {
    const home = homedir();
    const target = resolve(expandTilde(path.trim(), home));
    await mkdir(target, { recursive: true });
    return this.browseDir(collapseTilde(target, home));
  }
}
