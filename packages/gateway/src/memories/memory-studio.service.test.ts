import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory } from '@midnite/shared';
import type { LlmService } from '../agent/llm/llm.service';
import type { MemoriesRepository } from './memories.repository';
import type { MemoryArtifactsRepository } from './memory-artifacts.repository';
import type { MemoryArtifactRow, MemorySourceRow } from '../db/schema';
import { MemoryStudioService } from './memory-studio.service';

// ── Fakes ──────────────────────────────────────────────────────────
function fakeMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: 'm1',
    title: 'Rockets',
    content: 'Rockets go up because of Newton’s third law.',
    projectId: null,
    sources: [],
    archived: false,
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

function makeMemoriesRepo(memory: Memory | null, sources: MemorySourceRow[] = []) {
  return {
    getMemory: vi.fn(() => (memory ? { id: memory.id } : undefined)),
    hydrate: vi.fn(() => memory!),
    listSources: vi.fn(() => sources),
  } as unknown as MemoriesRepository;
}

function makeArtifactsRepo() {
  const rows = new Map<string, MemoryArtifactRow>();
  const repo = {
    rows,
    getByKind: vi.fn((memoryId: string, kind: string) =>
      [...rows.values()].find((r) => r.memoryId === memoryId && r.kind === kind),
    ),
    insert: vi.fn((row: MemoryArtifactRow) => {
      rows.set(row.id, row);
      return row;
    }),
    update: vi.fn((id: string, patch: Partial<MemoryArtifactRow>) => {
      const row = { ...rows.get(id)!, ...patch };
      rows.set(id, row);
      return row;
    }),
    get: vi.fn((_m: string, id: string) => rows.get(id)),
    list: vi.fn((memoryId: string) => [...rows.values()].filter((r) => r.memoryId === memoryId)),
    delete: vi.fn((_m: string, id: string) => {
      rows.delete(id);
    }),
    hydrate: vi.fn((row: MemoryArtifactRow) => ({ ...row, error: row.error ?? null }) as never),
  };
  return repo as unknown as MemoryArtifactsRepository & { rows: Map<string, MemoryArtifactRow> };
}

function makeLlm(opts: { enabled?: boolean; text?: string; throws?: boolean } = {}) {
  return {
    enabled: opts.enabled ?? true,
    getActModel: () => 'test-model',
    generateText: vi.fn(async () => {
      if (opts.throws) throw new Error('provider exploded');
      return { text: opts.text ?? '# Brief\n\nRockets summary.', model: 'test-model' };
    }),
  } as unknown as LlmService;
}

describe('MemoryStudioService', () => {
  let artifacts: ReturnType<typeof makeArtifactsRepo>;

  beforeEach(() => {
    artifacts = makeArtifactsRepo();
  });

  it('throws 404 listing artifacts of an unknown memory', () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(null), artifacts, makeLlm());
    expect(() => svc.listArtifacts('nope')).toThrow(NotFoundException);
  });

  it('generate() creates a pending row of the right format', () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, makeLlm());
    const brief = svc.generate('m1', 'brief');
    expect(brief).toMatchObject({ kind: 'brief', format: 'markdown', status: 'pending' });
    const info = svc.generate('m1', 'infographic');
    expect(info.format).toBe('svg');
  });

  it('generate() reuses the existing row for a kind (regenerate)', () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, makeLlm());
    const first = svc.generate('m1', 'brief');
    const again = svc.generate('m1', 'brief');
    expect(again.id).toBe(first.id);
    expect(artifacts.rows.size).toBe(1);
  });

  it('runGeneration succeeds → ready with fenced markdown stripped', async () => {
    const llm = makeLlm({ text: '```markdown\n# Brief\n\nBody.\n```' });
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, llm);
    const { id } = svc.generate('m1', 'brief');
    await svc.runGeneration('m1', id, 'brief');
    const row = artifacts.rows.get(id)!;
    expect(row.status).toBe('ready');
    expect(row.content).toBe('# Brief\n\nBody.');
    expect(llm.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'test-model' }),
      'memory',
    );
  });

  it('runGeneration for infographic extracts the <svg> slice', async () => {
    const llm = makeLlm({ text: 'Here you go:\n```svg\n<svg viewBox="0 0 800 600"><rect/></svg>\n```' });
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, llm);
    const { id } = svc.generate('m1', 'infographic');
    await svc.runGeneration('m1', id, 'infographic');
    const row = artifacts.rows.get(id)!;
    expect(row.status).toBe('ready');
    expect(row.content).toBe('<svg viewBox="0 0 800 600"><rect/></svg>');
  });

  it('fails with an honest message when no provider is configured', async () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, makeLlm({ enabled: false }));
    const { id } = svc.generate('m1', 'brief');
    await svc.runGeneration('m1', id, 'brief');
    const row = artifacts.rows.get(id)!;
    expect(row.status).toBe('failed');
    expect(row.error).toMatch(/no ai provider/i);
  });

  it('fails when the corpus is empty', async () => {
    const svc = new MemoryStudioService(
      makeMemoriesRepo(fakeMemory({ content: '   ' })),
      artifacts,
      makeLlm(),
    );
    const { id } = svc.generate('m1', 'brief');
    await svc.runGeneration('m1', id, 'brief');
    expect(artifacts.rows.get(id)!.status).toBe('failed');
    expect(artifacts.rows.get(id)!.error).toMatch(/no content or ingested sources/i);
  });

  it('records the failure on the row when the LLM throws', async () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, makeLlm({ throws: true }));
    const { id } = svc.generate('m1', 'brief');
    await svc.runGeneration('m1', id, 'brief');
    const row = artifacts.rows.get(id)!;
    expect(row.status).toBe('failed');
    expect(row.error).toMatch(/provider exploded/);
  });

  it('deleteArtifact removes a row (404 when absent)', () => {
    const svc = new MemoryStudioService(makeMemoriesRepo(fakeMemory()), artifacts, makeLlm());
    const { id } = svc.generate('m1', 'brief');
    svc.deleteArtifact('m1', id);
    expect(artifacts.rows.size).toBe(0);
    expect(() => svc.deleteArtifact('m1', 'gone')).toThrow(NotFoundException);
  });
});
