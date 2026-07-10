import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsService } from './fs.service';

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
