import { describe, expect, it, vi } from 'vitest';
import type { TaskRetro, TaskSummary } from '@midnite/shared';
import type { RetroPort } from '../retro/retro-port';
import type { LlmService } from '../agent/llm/llm.service';
import type { DigestRepository } from './digest.repository';
import { DigestBuilderService } from './digest-builder.service';
import type { DigestInsert } from '../db/schema';

const task = (id: string, status: TaskSummary['status'], repo?: string): TaskSummary =>
  ({ id, title: `task ${id}`, status, priority: 1, retryCount: 0, tags: [], repo } as TaskSummary);

const window = { from: '2026-07-10T08:00:00.000Z', to: '2026-07-11T08:00:00.000Z' };

function make(opts: { enabled?: boolean; headline?: string; throws?: boolean; retros?: Record<string, TaskRetro> } = {}) {
  const inserted: DigestInsert[] = [];
  const repo = { insert: vi.fn((r: DigestInsert) => { inserted.push(r); return r; }) } as unknown as DigestRepository;
  const retro: RetroPort = {
    get: vi.fn((id: string) => opts.retros?.[id]),
    buildAndStore: vi.fn(),
    storeNarrative: vi.fn(),
  };
  const generateStructured = vi.fn(async () => {
    if (opts.throws) throw new Error('boom');
    return { data: { headline: opts.headline ?? 'A steady day.' } };
  });
  const llm = { enabled: opts.enabled ?? true, getActModel: () => 'sonnet4.6', generateStructured } as unknown as LlmService;
  return { svc: new DigestBuilderService(retro, llm, repo), inserted, generateStructured };
}

describe('DigestBuilderService', () => {
  it('aggregates counts + sections deterministically', async () => {
    const { svc } = make({ enabled: false });
    const digest = await svc.build({
      window,
      groupBy: 'repo',
      tasks: [task('t1', 'done', 'a'), task('t2', 'done', 'a'), task('t3', 'abandoned', 'b')],
    });
    expect(digest.counts).toEqual({ shipped: 2, failed: 1, needsAttention: 0, total: 3 });
    expect(digest.sections).toHaveLength(2);
    expect(digest.sections[0]!.key).toBe('a'); // larger section first
    expect(digest.markdown).toContain('shipped');
  });

  it('surfaces abandoned tasks + retro failures as highlights', async () => {
    const failRetro: TaskRetro = {
      taskId: 't3', outcome: 'abandoned', timeline: [], attempts: [],
      failures: [{ id: 'f1', taskId: 't3', class: 'crash', detail: 'exit 137', retryIndex: 0, at: window.to }],
      durations: { waitMs: null, workMs: null, totalMs: null }, narrative: null, createdAt: window.to,
    };
    const { svc } = make({ enabled: false, retros: { t3: failRetro } });
    const digest = await svc.build({ window, groupBy: 'repo', tasks: [task('t1', 'done', 'a'), task('t3', 'abandoned', 'b')] });
    expect(digest.highlights[0]!.taskId).toBe('t3');
    expect(digest.highlights[0]!.note).toContain('exit 137');
  });

  it('adds an LLM headline when the model is available', async () => {
    const { svc, inserted } = make({ headline: 'Three shipped, one abandoned.' });
    const digest = await svc.build({ window, groupBy: 'repo', tasks: [task('t1', 'done')] });
    expect(digest.headline).toEqual({ headline: 'Three shipped, one abandoned.', generatedBy: 'llm' });
    expect(digest.markdown).toContain('Three shipped');
    expect(inserted[0]!.hasHeadline).toBe(1);
  });

  it('is fail-soft: deterministic-only when the LLM is off', async () => {
    const { svc, generateStructured, inserted } = make({ enabled: false });
    const digest = await svc.build({ window, groupBy: 'repo', tasks: [task('t1', 'done')] });
    expect(digest.headline).toBeNull();
    expect(generateStructured).not.toHaveBeenCalled();
    expect(inserted[0]!.hasHeadline).toBe(0);
  });

  it('is fail-soft: deterministic-only when the LLM call throws', async () => {
    const { svc } = make({ throws: true });
    const digest = await svc.build({ window, groupBy: 'repo', tasks: [task('t1', 'done')] });
    expect(digest.headline).toBeNull();
  });

  it('persists the digest row', async () => {
    const { svc, inserted } = make({ enabled: false });
    const digest = await svc.build({ window, groupBy: 'repo', tasks: [task('t1', 'done')] });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.id).toBe(digest.id);
    expect(inserted[0]!.taskCount).toBe(1);
  });
});
