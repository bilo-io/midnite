import { describe, expect, it } from 'vitest';
import type { BulkCreateTaskResponse } from '@midnite/shared';
import { bulkExitCode, bulkResultRows, bulkSummaryLine } from './bulk';

const RES: BulkCreateTaskResponse = {
  results: [
    { line: 'fix login bug', taskId: 't1', kind: 'bug', status: 'todo' },
    { line: 'write docs', error: 'classification failed' },
  ],
  counts: { created: 1, skipped: 0, failed: 1 },
};

describe('bulkExitCode', () => {
  it('is 0 when at least one task was created (partial success)', () => {
    expect(bulkExitCode({ created: 1, skipped: 0, failed: 1 })).toBe(0);
  });

  it('is 1 only when every attempted line failed', () => {
    expect(bulkExitCode({ created: 0, skipped: 0, failed: 3 })).toBe(1);
  });

  it('is 0 for an all-skipped batch (nothing created, nothing failed)', () => {
    expect(bulkExitCode({ created: 0, skipped: 4, failed: 0 })).toBe(0);
  });
});

describe('bulkSummaryLine', () => {
  it('renders the created/skipped/failed tally', () => {
    expect(bulkSummaryLine({ created: 3, skipped: 1, failed: 1 })).toBe('3 created, 1 skipped, 1 failed');
  });
});

describe('bulkResultRows', () => {
  it('shows kind + status for a created line and the error for a failed one', () => {
    const rows = bulkResultRows(RES);
    expect(rows[0]).toEqual(['fix login bug', 'bug', 'todo']);
    expect(rows[1]).toEqual(['write docs', '—', 'error: classification failed']);
  });

  it('truncates a long line', () => {
    const long = 'x'.repeat(80);
    const [row] = bulkResultRows({ results: [{ line: long }], counts: { created: 0, skipped: 0, failed: 1 } });
    expect(row![0]!.length).toBeLessThan(long.length);
    expect(row![0]!.endsWith('…')).toBe(true);
  });
});
