import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionUsageService } from './session-usage.service';
import type { SessionUsageRepository } from './session-usage.repository';
import type { SessionUsageRow } from '../db/schema';

const dir = mkdtempSync(join(tmpdir(), 'midnite-collector-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function writeTranscript(name: string, records: unknown[]): string {
  const path = join(dir, name);
  writeFileSync(path, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return path;
}

function makeService(agentCli = 'claude') {
  const store = new Map<string, SessionUsageRow>();
  const repo = {
    upsert: vi.fn((row: SessionUsageRow) => store.set(row.sessionId, row)),
    get: vi.fn((id: string) => store.get(id)),
    getMany: vi.fn((ids: string[]) => ids.map((id) => store.get(id)).filter(Boolean)),
    getAgentCli: () => agentCli,
  } as unknown as SessionUsageRepository;
  const svc = new SessionUsageService(repo);
  return { svc, repo, store };
}

describe('SessionUsageService.harvestFromTranscript', () => {
  let svc: SessionUsageService;
  let repo: SessionUsageRepository;
  beforeEach(() => {
    ({ svc, repo } = makeService());
  });

  it('returns null and does not write when no transcript path', async () => {
    expect(await svc.harvestFromTranscript('t1', undefined)).toBeNull();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('returns null for an unreadable path (fail-open)', async () => {
    expect(await svc.harvestFromTranscript('t1', join(dir, 'missing.jsonl'))).toBeNull();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('parses usage, prices it, and upserts (measured=true, agentCli stamped)', async () => {
    const path = writeTranscript('s1.jsonl', [
      {
        type: 'assistant',
        message: {
          role: 'assistant',
          model: 'claude-sonnet-4-6',
          usage: { input_tokens: 1_000_000, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        },
      },
    ]);
    const result = await svc.harvestFromTranscript('t1', path, '2026-07-08T00:00:00.000Z');
    expect(result).not.toBeNull();
    expect(result!.measured).toBe(true);
    expect(result!.agentCli).toBe('claude');
    expect(result!.inputTokens).toBe(1_000_000);
    expect(result!.contextTokens).toBe(1_000_000);
    // sonnet input $3/M → $3.
    expect(result!.estCostUsd).toBeCloseTo(3, 6);
    expect(repo.upsert).toHaveBeenCalledOnce();
  });

  it('stores tokens with a null cost for an unpriced model', async () => {
    const path = writeTranscript('s2.jsonl', [
      {
        type: 'assistant',
        message: { role: 'assistant', model: 'mystery-9000', usage: { input_tokens: 500, output_tokens: 100 } },
      },
    ]);
    const result = await svc.harvestFromTranscript('t2', path);
    expect(result!.estCostUsd).toBeNull();
    expect(result!.inputTokens).toBe(500);
  });

  it('get() returns the stored contract row, getManyMap keys by id', async () => {
    const path = writeTranscript('s3.jsonl', [
      { type: 'assistant', message: { role: 'assistant', model: 'claude-opus-4-8', usage: { input_tokens: 10, output_tokens: 5 } } },
    ]);
    await svc.harvestFromTranscript('t3', path);
    expect(svc.get('t3')?.inputTokens).toBe(10);
    expect(svc.get('nope')).toBeNull();
    expect(svc.getManyMap(['t3', 'nope']).get('t3')?.measured).toBe(true);
  });
});
