import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
});
