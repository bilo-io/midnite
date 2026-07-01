import { describe, expect, it } from 'vitest';
import { PrDiffSchema } from './pr-diff.js';

describe('PrDiffSchema', () => {
  const valid = {
    prUrl: 'https://github.com/bilo-io/midnite/pull/42',
    files: [
      {
        path: 'src/foo.ts',
        status: 'modified',
        additions: 2,
        deletions: 1,
        binary: false,
        hunks: [
          {
            header: '@@ -1,3 +1,4 @@',
            oldStart: 1,
            oldLines: 3,
            newStart: 1,
            newLines: 4,
            lines: [{ kind: 'add', content: 'const c = 4;', newLine: 3 }],
          },
        ],
      },
    ],
    additions: 2,
    deletions: 1,
    truncated: false,
    hiddenFileCount: 0,
    hiddenFiles: [],
    fetchedAt: '2026-07-01T00:00:00.000Z',
  };

  it('accepts a well-formed structured diff', () => {
    expect(PrDiffSchema.parse(valid)).toMatchObject({ prUrl: valid.prUrl });
  });

  it('rejects an unknown file status', () => {
    const bad = { ...valid, files: [{ ...valid.files[0], status: 'exploded' }] };
    expect(PrDiffSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a non-URL prUrl', () => {
    expect(PrDiffSchema.safeParse({ ...valid, prUrl: 'not-a-url' }).success).toBe(false);
  });
});
