import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@midnite/shared';
import type { AuditService } from '../audit/audit.service';
import type { GhRunner } from './lib/github-review';
import { PrReviewService } from './pr-review.service';
import type { PrStatusService } from './pr-status.service';
import type { TasksRepository } from './tasks.repository';

const fakeTask = { id: 't1', title: 'x', status: 'wip' } as unknown as Task;

/** Subclass to feed a stub `gh` runner (the base returns undefined → real gh). */
class TestPrReviewService extends PrReviewService {
  constructor(deps: ConstructorParameters<typeof PrReviewService>, private readonly stubGh: GhRunner) {
    super(...deps);
  }
  protected override get runGh(): GhRunner {
    return this.stubGh;
  }
}

function make(prUrl: string | null, gh: GhRunner) {
  const repo = { getTask: vi.fn(() => (prUrl === null ? undefined : ({ id: 't1', prUrl } as unknown))) } as unknown as TasksRepository;
  const prStatus = { refresh: vi.fn(async () => fakeTask) } as unknown as PrStatusService;
  const audit = { record: vi.fn() } as unknown as AuditService;
  const service = new TestPrReviewService([repo, prStatus, undefined, audit], gh);
  return { service, repo, prStatus, audit };
}

const okGh: GhRunner = async () => JSON.stringify({ html_url: 'u', state: 'APPROVED' });

describe('PrReviewService', () => {
  it('404s when the task has no PR', async () => {
    const { service } = make(null, okGh);
    await expect(service.submitReview('t1', { event: 'approve', comments: [] }, 'u1')).rejects.toThrow(NotFoundException);
  });

  it('404s when the task PR URL is unparseable', async () => {
    const { service } = make('https://example.com/not-a-pr', okGh);
    await expect(service.mergePr('t1', 'squash', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('submits a review, refreshes status, and audits', async () => {
    const gh = vi.fn(okGh);
    const { service, prStatus, audit } = make('https://github.com/acme/api/pull/7', gh);

    const task = await service.submitReview('t1', { event: 'approve', comments: [] }, 'admin');

    expect(gh).toHaveBeenCalledOnce();
    expect(prStatus.refresh).toHaveBeenCalledWith('t1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'task.pr_reviewed', userId: 'admin' }));
    expect(task).toBe(fakeTask);
  });

  it('merges, refreshes, and audits', async () => {
    const gh = vi.fn(async () => '');
    const { service, prStatus, audit } = make('https://github.com/acme/api/pull/7', gh);

    await service.mergePr('t1', 'squash', 'admin');

    expect(gh).toHaveBeenCalledWith(['pr', 'merge', 'https://github.com/acme/api/pull/7', '--squash']);
    expect(prStatus.refresh).toHaveBeenCalledWith('t1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'task.pr_merged' }));
  });

  it('maps a GitHub refusal to a 502 (never a generic 500)', async () => {
    const gh: GhRunner = async () => {
      throw new Error('Pull request is not mergeable');
    };
    const { service, prStatus } = make('https://github.com/acme/api/pull/7', gh);
    await expect(service.mergePr('t1', 'squash', 'u1')).rejects.toThrow(BadGatewayException);
    expect(prStatus.refresh).not.toHaveBeenCalled();
  });
});
