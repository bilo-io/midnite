import { BadGatewayException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@midnite/shared';
import type { AuditService } from '../audit/audit.service';
import type { GhRunner } from './lib/github-review';
import { PrReviewService } from './pr-review.service';
import type { PrReviewCommentsRepository } from './pr-review-comments.repository';
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

function make(prUrl: string | null, gh: GhRunner, draftRows: unknown[] = []) {
  const repo = { getTask: vi.fn(() => (prUrl === null ? undefined : ({ id: 't1', prUrl } as unknown))) } as unknown as TasksRepository;
  const prStatus = { refresh: vi.fn(async () => fakeTask) } as unknown as PrStatusService;
  const drafts = {
    listDrafts: vi.fn(() => draftRows),
    markSubmitted: vi.fn(),
    get: vi.fn(),
    insert: vi.fn((row: unknown) => row),
    updateBody: vi.fn((id: string, body: string) => ({ id, body, state: 'draft' })),
    remove: vi.fn(() => true),
  } as unknown as PrReviewCommentsRepository;
  const audit = { record: vi.fn() } as unknown as AuditService;
  const service = new TestPrReviewService([repo, prStatus, drafts, undefined, audit], gh);
  return { service, repo, prStatus, drafts, audit };
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

  // ---- drafts (Phase 52 D) ----

  it('creates a draft only when the task has a PR', async () => {
    const noPr = make(null, okGh);
    expect(() => noPr.service.createDraft('t1', { path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit' }, 'u1')).toThrow(
      NotFoundException,
    );

    const ok = make('https://github.com/acme/api/pull/7', okGh);
    ok.service.createDraft('t1', { path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit' }, 'u1');
    expect(ok.drafts.insert).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 't1', path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit', author: 'u1', state: 'draft' }),
    );
  });

  it('refuses to edit/delete another author\'s draft (403) and a missing one (404)', () => {
    const { service, drafts } = make('https://github.com/acme/api/pull/7', okGh);
    (drafts.get as ReturnType<typeof vi.fn>).mockReturnValueOnce({ id: 'c1', author: 'someone-else', state: 'draft' });
    expect(() => service.updateDraft('c1', 'x', 'u1')).toThrow(ForbiddenException);
    (drafts.get as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);
    expect(() => service.deleteDraft('c1', 'u1')).toThrow(NotFoundException);
  });

  it('sources the submitted review from persisted drafts and flips them to submitted', async () => {
    const gh = vi.fn(okGh);
    const draftRows = [
      { id: 'd1', path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit' },
      { id: 'd2', path: 'b.ts', line: 9, side: 'LEFT', body: 'here' },
    ];
    const { service, drafts } = make('https://github.com/acme/api/pull/7', gh, draftRows);

    await service.submitReview('t1', { event: 'comment', comments: [] }, 'u1');

    const [, input] = gh.mock.calls[0]!;
    const body = JSON.parse(input as string);
    expect(body.comments).toHaveLength(2);
    expect(body.comments[0]).toMatchObject({ path: 'a.ts', line: 3, side: 'RIGHT', body: 'nit' });
    expect(drafts.markSubmitted).toHaveBeenCalledWith(['d1', 'd2']);
  });

  it('rejects an empty comment review (no body, no drafts) before hitting GitHub', async () => {
    const gh = vi.fn(okGh);
    const { service } = make('https://github.com/acme/api/pull/7', gh, []);
    await expect(service.submitReview('t1', { event: 'comment', comments: [] }, 'u1')).rejects.toThrow(BadRequestException);
    expect(gh).not.toHaveBeenCalled();
  });
});
