import type { MidniteConfig, Task } from '@midnite/shared';
import { describe, expect, it, vi } from 'vitest';
import type { KnowledgeWatcherService } from './knowledge-watcher.service';
import { KnowledgeService } from './knowledge.service';
import type { KnowledgeFile, KnowledgeManifestEntry } from './lib/knowledge';
import type { LlmService } from './llm/llm.service';

type WatcherSeed = { manifest?: KnowledgeManifestEntry[]; files?: Record<string, string> };

function makeService(opts: {
  enabled?: boolean;
  llmEnabled?: boolean;
  maxBytes?: number;
  watcher?: WatcherSeed;
  select?: unknown; // what the model "returns" as `files`
  throws?: boolean;
}): { svc: KnowledgeService; generate: ReturnType<typeof vi.fn> } {
  const config = {
    knowledge: { enabled: opts.enabled ?? true, maxBytes: opts.maxBytes ?? 4096 },
  } as unknown as MidniteConfig;

  const manifest = opts.watcher?.manifest ?? [];
  const files = opts.watcher?.files ?? {};
  const watcher = {
    getManifest: () => manifest,
    readFiles: (names: string[]): Promise<KnowledgeFile[]> =>
      Promise.resolve(names.filter((n) => n in files).map((n) => ({ file: n, content: files[n]! }))),
  } as unknown as KnowledgeWatcherService;

  const generate = vi.fn(() => {
    if (opts.throws) throw new Error('llm boom');
    return Promise.resolve({ data: { files: opts.select ?? [] }, model: 'plan', usage: {} });
  });
  const llm = {
    get enabled() {
      return opts.llmEnabled ?? true;
    },
    getPlanModel: () => 'plan',
    generateStructured: generate,
  } as unknown as LlmService;

  return { svc: new KnowledgeService(config, watcher, llm), generate };
}

const task = (title: string, prompt = ''): Task => ({ id: 't1', title, prompt }) as Task;

describe('KnowledgeService.enrich', () => {
  const manifest = [{ file: 'conventions.md', headings: ['Style'] }];

  it('returns the prompt unchanged when the feature is disabled', async () => {
    const { svc, generate } = makeService({ enabled: false, watcher: { manifest } });
    expect(await svc.enrich('P', task('t'))).toBe('P');
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns the prompt unchanged when AI is off', async () => {
    const { svc, generate } = makeService({ llmEnabled: false, watcher: { manifest } });
    expect(await svc.enrich('P', task('t'))).toBe('P');
    expect(generate).not.toHaveBeenCalled();
  });

  it('returns the prompt unchanged when the manifest is empty (no model call)', async () => {
    const { svc, generate } = makeService({ watcher: { manifest: [] } });
    expect(await svc.enrich('P', task('t'))).toBe('P');
    expect(generate).not.toHaveBeenCalled();
  });

  it('appends a knowledge block for the files the model selects', async () => {
    const { svc } = makeService({
      watcher: { manifest, files: { 'conventions.md': 'Always use kebab-case.' } },
      select: ['conventions.md'],
    });
    const out = await svc.enrich('Do the thing', task('rename files'));
    expect(out).toContain('Do the thing');
    expect(out).toContain('## Knowledge files');
    expect(out).toContain('### conventions.md');
    expect(out).toContain('Always use kebab-case.');
  });

  it('returns unchanged when the model selects nothing', async () => {
    const { svc } = makeService({ watcher: { manifest }, select: [] });
    expect(await svc.enrich('P', task('t'))).toBe('P');
  });

  it('drops a model selection that is not a real manifest file', async () => {
    const { svc } = makeService({
      watcher: { manifest, files: { 'conventions.md': 'x' } },
      select: ['../../etc/passwd', 'made-up.md'],
    });
    expect(await svc.enrich('P', task('t'))).toBe('P');
  });

  it('fails open (prompt unchanged) when the model call throws', async () => {
    const { svc } = makeService({ watcher: { manifest }, throws: true });
    expect(await svc.enrich('P', task('t'))).toBe('P');
  });
});
