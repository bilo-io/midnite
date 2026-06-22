import type { MidniteConfig } from '@midnite/shared';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { KnowledgeWatcherService } from './knowledge-watcher.service';

/** Poll until `predicate` holds or time runs out — chokidar events are async. */
async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 30));
  }
}

function makeConfig(dir: string | undefined, enabled = true): MidniteConfig {
  return { knowledge: { enabled, dir, maxBytes: 4096 } } as unknown as MidniteConfig;
}

describe('KnowledgeWatcherService', () => {
  let svc: KnowledgeWatcherService | undefined;
  let dir: string | undefined;

  afterEach(async () => {
    await svc?.onModuleDestroy();
    svc = undefined;
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it('is inert (empty manifest, resolves ready) when disabled', async () => {
    svc = new KnowledgeWatcherService(makeConfig(undefined, false));
    svc.onModuleInit();
    await svc.ready;
    expect(svc.getManifest()).toEqual([]);
  });

  it('indexes existing files on boot with their headings', async () => {
    dir = await mkdtemp(join(tmpdir(), 'midnite-kw-'));
    await writeFile(join(dir, 'guide.md'), '# Guide\n\n## Setup\nrun it\n## Deploy', 'utf8');
    await mkdir(join(dir, 'notes'), { recursive: true });
    await writeFile(join(dir, 'notes', 'db.md'), '# DB notes', 'utf8');
    // A non-markdown file must be ignored.
    await writeFile(join(dir, 'readme.txt'), 'not markdown', 'utf8');

    svc = new KnowledgeWatcherService(makeConfig(dir));
    svc.onModuleInit();
    await svc.ready;
    await waitFor(() => svc!.getManifest().length === 2);

    const manifest = svc.getManifest();
    expect(manifest.map((m) => m.file)).toEqual(['guide.md', 'notes/db.md']);
    expect(manifest[0]!.headings).toEqual(['Guide', 'Setup', 'Deploy']);
  });

  it('updates the manifest on add, change and unlink', async () => {
    dir = await mkdtemp(join(tmpdir(), 'midnite-kw-'));
    svc = new KnowledgeWatcherService(makeConfig(dir));
    svc.onModuleInit();
    await svc.ready;

    await writeFile(join(dir, 'new.md'), '# New', 'utf8');
    await waitFor(() => svc!.getManifest().some((m) => m.file === 'new.md'));

    await writeFile(join(dir, 'new.md'), '# New\n## Added section', 'utf8');
    await waitFor(() => svc!.getManifest()[0]?.headings.includes('Added section') === true);

    await rm(join(dir, 'new.md'));
    await waitFor(() => svc!.getManifest().length === 0);
  });

  it('reads selected file content and refuses paths escaping the root', async () => {
    dir = await mkdtemp(join(tmpdir(), 'midnite-kw-'));
    await writeFile(join(dir, 'a.md'), 'alpha body', 'utf8');
    svc = new KnowledgeWatcherService(makeConfig(dir));
    svc.onModuleInit();
    await svc.ready;
    await waitFor(() => svc!.getManifest().length === 1);

    const read = await svc.readFiles(['a.md', '../../etc/passwd', 'missing.md']);
    expect(read).toEqual([{ file: 'a.md', content: 'alpha body' }]);
  });
});
