import { Inject, Injectable, Optional } from '@nestjs/common';
import { mkdir, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import type { BrowseDirResponse, DirEntry, MidniteConfig } from '@midnite/shared';
import { MIDNITE_CONFIG } from '../config.token';
import { assertPathAllowed, isPathAllowed, resolveRoots } from './path-jail';
import { collapseTilde, expandTilde } from './path-tilde';

/**
 * Read-only directory browser backing the web folder picker. Sessions spawn on
 * the gateway host, so the picker must navigate *this* machine's filesystem —
 * the browser can't surface real paths. Paths cross the wire in `~`-form.
 *
 * `gateway.fs.allowedRoots` optionally confines both operations; unset (the
 * default) leaves the picker unrestricted. See `path-jail.ts` for what that
 * guarantee does and does not cover.
 */
@Injectable()
export class FsService {
  /** Configured roots, resolved to absolute paths once. Empty ⇒ no restriction. */
  private readonly roots: string[];

  constructor(
    // `@Optional()` so the many unit specs that build a bare `new FsService()`
    // keep working — with no config there is no policy, which is the default
    // anyway. Explicitly `@Inject`ed because esbuild drops type-only constructor
    // imports and Nest would otherwise inject `undefined` (see docs/NATIVE... and
    // `di-explicit-inject.test.ts`).
    @Optional() @Inject(MIDNITE_CONFIG) config?: MidniteConfig,
  ) {
    this.roots = resolveRoots(config?.gateway.fs.allowedRoots ?? [], homedir());
  }

  /**
   * List the immediate subdirectories of `path`. Defaults to the home directory,
   * or — when a jail is configured and home sits outside it — to the first
   * allowed root, so the picker never opens on a directory it must refuse.
   */
  async browseDir(path?: string): Promise<BrowseDirResponse> {
    const home = homedir();
    const requested = (path ?? '').trim() || this.defaultDir(home);
    const target = resolve(expandTilde(requested, home));
    assertPathAllowed(target, this.roots);

    const dirents = await readdir(target, { withFileTypes: true });
    const entries: DirEntry[] = dirents
      // Folders only (and symlinks, which may point at one); skip dotfiles to
      // keep the list to the directories people actually navigate to.
      .filter((d) => (d.isDirectory() || d.isSymbolicLink()) && !d.name.startsWith('.'))
      .map((d) => ({ name: d.name, path: collapseTilde(join(target, d.name), home) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentAbs = dirname(target);
    // A jail also caps upward navigation: at a root, `parent` is null so the
    // picker stops offering a step the server would only refuse.
    const atCeiling = parentAbs === target || !isPathAllowed(parentAbs, this.roots);
    const parent = atCeiling ? null : collapseTilde(parentAbs, home);
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
    // Checked before `mkdir`, not after: a refused path must not leave a
    // directory behind on the host.
    assertPathAllowed(target, this.roots);
    await mkdir(target, { recursive: true });
    return this.browseDir(collapseTilde(target, home));
  }

  /** Where the picker opens when the client names no path. */
  private defaultDir(home: string): string {
    if (this.roots.length === 0) return '~';
    return isPathAllowed(home, this.roots) ? home : this.roots[0]!;
  }
}
