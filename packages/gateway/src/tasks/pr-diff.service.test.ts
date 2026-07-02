import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrDiffService } from './pr-diff.service';
import type { TasksRepository } from './tasks.repository';
import type { TaskRow } from '../db/schema';

const PR_URL = 'https://github.com/bilo-io/midnite/pull/42';

/** A PrDiffService whose raw fetch is stubbed, over a fake repository. */
function makeService(row: Partial<TaskRow> | undefined, raw: string | null) {
  const repo = { getTask: vi.fn().mockReturnValue(row) } as unknown as TasksRepository;
  class TestPrDiffService extends PrDiffService {
    protected override fetchRaw(): Promise<string | null> {
      return Promise.resolve(raw);
    }
  }
  return new TestPrDiffService(repo);
}

describe('PrDiffService.getDiffForTask', () => {
  it('404s an unknown task', async () => {
    const svc = makeService(undefined, 'x');
    await expect(svc.getDiffForTask('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('404s a task with no PR URL', async () => {
    const svc = makeService({ id: 't1', prUrl: null } as Partial<TaskRow>, 'x');
    await expect(svc.getDiffForTask('t1')).rejects.toThrow(/no GitHub PR/);
  });

  it('fails open as a 503 when the diff cannot be fetched', async () => {
    const svc = makeService({ id: 't1', prUrl: PR_URL } as Partial<TaskRow>, null);
    await expect(svc.getDiffForTask('t1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a structured diff stamped with the prUrl on success', async () => {
    const raw = ['diff --git a/foo.ts b/foo.ts', '--- a/foo.ts', '+++ b/foo.ts', '@@ -1,1 +1,1 @@', '-a', '+b'].join('\n');
    const svc = makeService({ id: 't1', prUrl: PR_URL } as Partial<TaskRow>, raw);
    const diff = await svc.getDiffForTask('t1');
    expect(diff.prUrl).toBe(PR_URL);
    expect(diff.files).toHaveLength(1);
    expect(diff.files[0]!.path).toBe('foo.ts');
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(1);
    expect(typeof diff.fetchedAt).toBe('string');
  });
});
