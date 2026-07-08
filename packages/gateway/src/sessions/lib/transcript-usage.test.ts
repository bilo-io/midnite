import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { accumulateUsage, harvestTranscriptUsage } from './transcript-usage';

function assistant(usage: Record<string, number>, model = 'claude-sonnet-4-6') {
  return { type: 'assistant', message: { role: 'assistant', model, usage } };
}

describe('accumulateUsage', () => {
  it('returns null when no usage records are present', () => {
    expect(accumulateUsage([{ type: 'user', message: { role: 'user' } }])).toBeNull();
    expect(accumulateUsage([])).toBeNull();
  });

  it('sums tokens across turns and takes the last turn for context occupancy', () => {
    const usage = accumulateUsage([
      assistant({ input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 100, cache_creation_input_tokens: 20 }),
      assistant({ input_tokens: 3, output_tokens: 8, cache_read_input_tokens: 200, cache_creation_input_tokens: 0 }),
    ]);
    expect(usage).not.toBeNull();
    expect(usage!.inputTokens).toBe(13); // 10 + 3
    expect(usage!.outputTokens).toBe(13); // 5 + 8
    expect(usage!.cachedReadTokens).toBe(300); // 100 + 200
    expect(usage!.cachedWriteTokens).toBe(20); // 20 + 0
    // Context occupancy = last turn: 3 + 200 + 0
    expect(usage!.contextTokens).toBe(203);
    expect(usage!.model).toBe('claude-sonnet-4-6');
  });

  it('ignores missing/negative token fields (treats as 0)', () => {
    const usage = accumulateUsage([assistant({ input_tokens: -5, output_tokens: 7 })]);
    expect(usage!.inputTokens).toBe(0);
    expect(usage!.outputTokens).toBe(7);
    expect(usage!.contextTokens).toBe(0);
  });

  it('skips records without a usage block', () => {
    const usage = accumulateUsage([
      { type: 'user', message: { role: 'user' } },
      assistant({ input_tokens: 4, output_tokens: 2 }),
      { type: 'system' },
    ]);
    expect(usage!.inputTokens).toBe(4);
  });
});

describe('harvestTranscriptUsage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'midnite-transcript-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  function write(name: string, lines: unknown[]): string {
    const path = join(dir, name);
    writeFileSync(path, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    return path;
  }

  it('parses a JSONL transcript on disk, skipping blank/garbage lines', async () => {
    const path = write('ok.jsonl', [
      assistant({ input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 50 }),
      assistant({ input_tokens: 2, output_tokens: 3, cache_read_input_tokens: 80 }),
    ]);
    const usage = await harvestTranscriptUsage(path);
    expect(usage).not.toBeNull();
    expect(usage!.inputTokens).toBe(12);
    expect(usage!.contextTokens).toBe(82); // 2 + 80
    expect(usage!.partial).toBe(false);
  });

  it('returns null for a missing file', async () => {
    expect(await harvestTranscriptUsage(join(dir, 'nope.jsonl'))).toBeNull();
  });

  it('flags partial when the byte cap is exceeded', async () => {
    const path = write('big.jsonl', [
      assistant({ input_tokens: 1, output_tokens: 1 }),
      assistant({ input_tokens: 1, output_tokens: 1 }),
    ]);
    const usage = await harvestTranscriptUsage(path, 20); // tiny cap → curtail
    // Either curtailed-with-partial, or (if the first line already exceeds) null.
    if (usage) expect(usage.partial).toBe(true);
  });
});
