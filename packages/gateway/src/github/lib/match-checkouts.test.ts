import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deriveCheckoutRoots, matchCheckouts, readCheckoutSlug } from './match-checkouts';

// Real directories rather than a mocked fs: the whole helper is about what git actually
// writes on disk (a `.git` dir, a `.git` *file* for a worktree), and a fake would let a
// wrong assumption about either pass.

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'midnite-checkouts-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** Create a plain checkout at `<root>/<name>` with `origin` pointing at `remote`. */
async function makeCheckout(name: string, remote: string | null, base = root): Promise<string> {
  const dir = join(base, name);
  await mkdir(join(dir, '.git'), { recursive: true });
  const config = remote
    ? `[core]\n\tbare = false\n[remote "origin"]\n\turl = ${remote}\n`
    : '[core]\n\tbare = false\n';
  await writeFile(join(dir, '.git', 'config'), config);
  return dir;
}

describe('matchCheckouts', () => {
  it('indexes every GitHub checkout one level under a root', async () => {
    await makeCheckout('midnite', 'git@github.com:bilo-io/midnite.git');
    await makeCheckout('other-app', 'https://github.com/bilo-io/other-app.git');

    const matches = await matchCheckouts([root]);

    expect(matches.get('bilo-io/midnite')?.path).toBe(join(root, 'midnite'));
    expect(matches.get('bilo-io/other-app')?.path).toBe(join(root, 'other-app'));
    expect(matches.size).toBe(2);
  });

  it('keys case-insensitively but reports the remote\'s own casing', async () => {
    await makeCheckout('midnite', 'git@github.com:Bilo-IO/Midnite.git');
    const matches = await matchCheckouts([root]);
    expect(matches.get('bilo-io/midnite')?.ownerRepo).toBe('Bilo-IO/Midnite');
  });

  it('skips directories that are not git checkouts', async () => {
    await mkdir(join(root, 'just-a-folder'), { recursive: true });
    await makeCheckout('real', 'git@github.com:bilo-io/real.git');
    expect((await matchCheckouts([root])).size).toBe(1);
  });

  it('skips checkouts whose remote is not GitHub', async () => {
    await makeCheckout('gitlab-app', 'git@gitlab.com:me/app.git');
    expect((await matchCheckouts([root])).size).toBe(0);
  });

  it('skips a checkout with no remote at all', async () => {
    await makeCheckout('local-only', null);
    expect((await matchCheckouts([root])).size).toBe(0);
  });

  it('matches the root itself when the root is a checkout', async () => {
    // Someone whose only registered repo is `~/Dev/midnite` derives the root `~/Dev`,
    // but a user may equally configure the checkout directory itself.
    const dir = await makeCheckout('inner', 'git@github.com:bilo-io/inner.git');
    const matches = await matchCheckouts([dir]);
    expect(matches.get('bilo-io/inner')?.path).toBe(dir);
  });

  it('does not descend two levels', async () => {
    const nested = join(root, 'level-one');
    await mkdir(nested, { recursive: true });
    await makeCheckout('deep', 'git@github.com:bilo-io/deep.git', nested);
    expect((await matchCheckouts([root])).size).toBe(0);
  });

  it('ignores dotfiles and node_modules', async () => {
    await makeCheckout('.hidden-checkout', 'git@github.com:bilo-io/hidden.git');
    await makeCheckout('node_modules', 'git@github.com:bilo-io/deps.git');
    expect((await matchCheckouts([root])).size).toBe(0);
  });

  it('follows a symlinked checkout directory', async () => {
    const elsewhere = await mkdtemp(join(tmpdir(), 'midnite-elsewhere-'));
    try {
      const real = await makeCheckout('app', 'git@github.com:bilo-io/app.git', elsewhere);
      await symlink(real, join(root, 'linked-app'));
      const matches = await matchCheckouts([root]);
      expect(matches.get('bilo-io/app')?.path).toBe(join(root, 'linked-app'));
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });

  it('resolves a worktree, whose .git is a file pointing at the shared admin dir', async () => {
    // midnite's own workflow puts every branch in `.worktrees/<branch>`, so treating a
    // worktree as "not a repo" would make this blind to the layout it ships with.
    const primary = await makeCheckout('midnite', 'git@github.com:bilo-io/midnite.git');
    const worktree = join(root, 'wt-feature');
    await mkdir(worktree, { recursive: true });
    await mkdir(join(primary, '.git', 'worktrees', 'wt-feature'), { recursive: true });
    await writeFile(
      join(worktree, '.git'),
      `gitdir: ${join(primary, '.git', 'worktrees', 'wt-feature')}\n`,
    );

    expect(await readCheckoutSlug(worktree)).toBe('bilo-io/midnite');
  });

  it('resolves a worktree whose own path contains a `worktrees` segment', async () => {
    // midnite's convention is `<repo>/.worktrees/<branch>`, so the pointer string holds
    // two `/worktrees/` segments. Truncating at the first one (`indexOf`) yields a config
    // path that doesn't exist, and the worktree is silently reported "not checked out".
    const primary = await makeCheckout('midnite', 'git@github.com:bilo-io/midnite.git');
    const worktree = join(primary, '.worktrees', 'feature-x');
    await mkdir(worktree, { recursive: true });
    const adminDir = join(primary, '.git', 'worktrees', 'feature-x');
    await mkdir(adminDir, { recursive: true });
    await writeFile(join(worktree, '.git'), `gitdir: ${adminDir}\n`);

    expect(await readCheckoutSlug(worktree)).toBe('bilo-io/midnite');
  });

  it('is best-effort over a missing root rather than throwing', async () => {
    await expect(matchCheckouts([join(root, 'does-not-exist')])).resolves.toEqual(new Map());
  });

  it('lets an earlier root win when two roots hold the same repo', async () => {
    const second = await mkdtemp(join(tmpdir(), 'midnite-second-'));
    try {
      await makeCheckout('primary', 'git@github.com:bilo-io/dup.git');
      await makeCheckout('clone', 'git@github.com:bilo-io/dup.git', second);
      const matches = await matchCheckouts([root, second]);
      expect(matches.get('bilo-io/dup')?.path).toBe(join(root, 'primary'));
    } finally {
      await rm(second, { recursive: true, force: true });
    }
  });

  it('deduplicates repeated roots', async () => {
    await makeCheckout('app', 'git@github.com:bilo-io/app.git');
    expect((await matchCheckouts([root, root, ''])).size).toBe(1);
  });
});

describe('deriveCheckoutRoots', () => {
  it('takes the parent of each registered path, deduplicated and order-preserving', () => {
    expect(
      deriveCheckoutRoots(['/Users/me/Dev/midnite', '/Users/me/Dev/other', '/Users/me/work/api']),
    ).toEqual(['/Users/me/Dev', '/Users/me/work']);
  });

  it('drops a path whose parent is the filesystem root', () => {
    // Deriving `/` would turn a settings page into a full-disk scan.
    expect(deriveCheckoutRoots(['/midnite'])).toEqual([]);
  });

  it('drops non-absolute paths (the caller expands `~` first)', () => {
    expect(deriveCheckoutRoots(['~/Dev/midnite', 'relative/path'])).toEqual([]);
  });

  it('returns nothing for an empty registry', () => {
    expect(deriveCheckoutRoots([])).toEqual([]);
  });
});
