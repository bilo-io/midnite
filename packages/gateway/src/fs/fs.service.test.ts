import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type MidniteConfig, parseConfig } from '@midnite/shared';
import { FsService } from './fs.service';
import { PathNotAllowedError } from './path-jail';

/** A config whose picker is confined to `allowedRoots`. */
function jailedTo(...allowedRoots: string[]): MidniteConfig {
  return parseConfig({ agent: {}, terminal: {}, knowledge: {}, gateway: { fs: { allowedRoots } } });
}

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'midnite-fs-'));
  mkdirSync(join(root, 'alpha'));
  mkdirSync(join(root, 'beta'));
  mkdirSync(join(root, '.hidden'));
  writeFileSync(join(root, 'a-file.txt'), 'x');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('FsService.browseDir', () => {
  const service = new FsService();

  it('lists only subdirectories, sorted, skipping dotfiles and files', async () => {
    const res = await service.browseDir(root);
    expect(res.entries.map((e) => e.name)).toEqual(['alpha', 'beta']);
    expect(res.path).toBe(root);
    expect(res.parent).toBe(tmpdir());
  });

  it('returns child paths that can themselves be browsed', async () => {
    const res = await service.browseDir(root);
    const alpha = res.entries.find((e) => e.name === 'alpha');
    expect(alpha).toBeDefined();
    const child = await service.browseDir(alpha!.path);
    expect(child.entries).toEqual([]);
    expect(child.parent).toBe(root);
  });

  it('rejects a path that is not a directory', async () => {
    await expect(service.browseDir(join(root, 'a-file.txt'))).rejects.toThrow();
  });

  it('rejects a path that does not exist', async () => {
    await expect(service.browseDir(join(root, 'nope'))).rejects.toThrow(/ENOENT/);
  });
});

describe('FsService.createDir', () => {
  const service = new FsService();

  it('creates a nested path recursively and returns its listing', async () => {
    const target = join(root, 'made', 'deeply', 'arcade');
    const res = await service.createDir(target);
    expect(statSync(target).isDirectory()).toBe(true);
    expect(res.path).toBe(target);
    expect(res.entries).toEqual([]);
  });

  it('is idempotent — creating an existing directory just lists it', async () => {
    const target = join(root, 'alpha');
    await expect(service.createDir(target)).resolves.toMatchObject({ path: target });
  });
});

describe('FsService with gateway.fs.allowedRoots', () => {
  it('browses inside a configured root', async () => {
    const service = new FsService(jailedTo(root));
    await expect(service.browseDir(join(root, 'alpha'))).resolves.toMatchObject({
      path: join(root, 'alpha'),
    });
  });

  it('refuses a path outside every root', async () => {
    const service = new FsService(jailedTo(join(root, 'alpha')));
    await expect(service.browseDir(join(root, 'beta'))).rejects.toThrow(PathNotAllowedError);
  });

  it('refuses a traversal that escapes the root', async () => {
    // `resolve()` collapses the `..` before the check, so the jail sees the real
    // destination rather than the literal string the client sent.
    const service = new FsService(jailedTo(join(root, 'alpha')));
    await expect(service.browseDir(join(root, 'alpha', '..', 'beta'))).rejects.toThrow(
      PathNotAllowedError,
    );
  });

  it('refuses a sibling directory sharing the root as a name prefix', async () => {
    const alpha = join(root, 'alpha');
    mkdirSync(`${alpha}-evil`, { recursive: true });
    const service = new FsService(jailedTo(alpha));
    await expect(service.browseDir(`${alpha}-evil`)).rejects.toThrow(PathNotAllowedError);
  });

  it('stops upward navigation at the root by reporting no parent', async () => {
    const service = new FsService(jailedTo(root));
    const res = await service.browseDir(root);
    // Unjailed, this same call reports `tmpdir()` as the parent (see above) — so
    // the picker would offer a "up one level" step the server then refuses.
    expect(res.parent).toBeNull();
  });

  it('still reports a parent for a directory below the root', async () => {
    const service = new FsService(jailedTo(root));
    const res = await service.browseDir(join(root, 'alpha'));
    expect(res.parent).toBe(root);
  });

  it('opens on the first root when home is outside the jail', async () => {
    const service = new FsService(jailedTo(root));
    const res = await service.browseDir();
    expect(res.path).toBe(root);
  });

  it('refuses to create a directory outside the jail, and creates nothing', async () => {
    const outside = join(root, 'beta', 'should-never-exist');
    const service = new FsService(jailedTo(join(root, 'alpha')));
    await expect(service.createDir(outside)).rejects.toThrow(PathNotAllowedError);
    expect(existsSync(outside)).toBe(false);
  });

  it('creates inside the jail as usual', async () => {
    const target = join(root, 'alpha', 'nested');
    const service = new FsService(jailedTo(join(root, 'alpha')));
    await expect(service.createDir(target)).resolves.toMatchObject({ path: target });
    expect(statSync(target).isDirectory()).toBe(true);
  });

  it('imposes no restriction when allowedRoots is empty — the default', async () => {
    const service = new FsService(jailedTo());
    await expect(service.browseDir(tmpdir())).resolves.toBeDefined();
  });
});
