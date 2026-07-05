import { randomUUID } from 'node:crypto';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  parseGithubPr,
  type CreatePrReviewDraft,
  type PrMergeMethod,
  type PrReviewComment,
  type PrReviewDraft,
  type PrReviewSubmission,
  type Task,
} from '@midnite/shared';
import { AuditService } from '../audit/audit.service';
import { WorkflowCredentialsService } from '../workflows/credentials/workflow-credentials.service';
import { mergeGithubPr, submitGithubReview, type GhRunner } from './lib/github-review';
import { PrReviewCommentsRepository, toDraft } from './pr-review-comments.repository';
import { PrStatusService } from './pr-status.service';
import { TasksRepository } from './tasks.repository';

/**
 * Phase 52 Theme C — review/merge a task's PR from inside midnite. Resolves the
 * task's `prUrl`, shells the write via `lib/github-review` (gh CLI primary; a
 * github workflow-credential REST token is the lazy fallback), then refreshes
 * `pr_status` so the board reflects the new review decision / merged state. Every
 * write is audited. A GitHub refusal (branch protection, unmergeable) surfaces as
 * a 502 with the API message rather than a generic 500.
 */
@Injectable()
export class PrReviewService {
  private readonly logger = new Logger(PrReviewService.name);

  constructor(
    @Inject(TasksRepository) private readonly repo: TasksRepository,
    @Inject(PrStatusService) private readonly prStatus: PrStatusService,
    @Inject(PrReviewCommentsRepository) private readonly drafts: PrReviewCommentsRepository,
    @Optional() @Inject(WorkflowCredentialsService) private readonly credentials?: WorkflowCredentialsService,
    @Optional() @Inject(AuditService) private readonly audit?: AuditService,
  ) {}

  // ---- inline comment drafts (Phase 52 D) — per-author, survive a reload ----

  listDrafts(taskId: string, author: string): PrReviewDraft[] {
    return this.drafts.listDrafts(taskId, author).map(toDraft);
  }

  createDraft(taskId: string, req: CreatePrReviewDraft, author: string): PrReviewDraft {
    this.requirePrUrl(taskId); // 404 if the task has no PR
    return toDraft(
      this.drafts.insert({
        id: randomUUID(),
        taskId,
        path: req.path,
        line: req.line,
        side: req.side,
        body: req.body,
        author,
        state: 'draft',
        createdAt: new Date().toISOString(),
      }),
    );
  }

  updateDraft(id: string, body: string, author: string): PrReviewDraft {
    const row = this.ownDraft(id, author);
    if (row.state !== 'draft') throw new BadRequestException('a submitted comment cannot be edited');
    const updated = this.drafts.updateBody(id, body);
    if (!updated) throw new NotFoundException(`review comment ${id} not found`);
    return toDraft(updated);
  }

  deleteDraft(id: string, author: string): void {
    const row = this.ownDraft(id, author);
    if (row.state !== 'draft') throw new BadRequestException('a submitted comment cannot be deleted');
    this.drafts.remove(id);
  }

  /** Fetch a comment, asserting the caller authored it (404 hides others'). */
  private ownDraft(id: string, author: string) {
    const row = this.drafts.get(id);
    if (!row) throw new NotFoundException(`review comment ${id} not found`);
    if (row.author !== author) throw new ForbiddenException('not your review comment');
    return row;
  }

  async submitReview(
    taskId: string,
    submission: PrReviewSubmission,
    author: string,
  ): Promise<Task> {
    const prUrl = this.requirePrUrl(taskId);
    // Inline comments are sourced from the author's persisted drafts (Decision §D).
    const draftRows = this.drafts.listDrafts(taskId, author);
    const comments: PrReviewComment[] = draftRows.map((d) => ({
      path: d.path,
      line: d.line,
      side: d.side === 'LEFT' ? 'LEFT' : 'RIGHT',
      body: d.body,
    }));
    // The real "empty review" guard (the client schema can't see the draft set).
    if (submission.event !== 'approve' && (submission.body?.trim().length ?? 0) === 0 && comments.length === 0) {
      throw new BadRequestException('a comment or request-changes review needs a body or at least one inline comment');
    }
    try {
      const result = await submitGithubReview(
        prUrl,
        { event: submission.event, body: submission.body, comments },
        { runGh: this.runGh, getToken: () => this.githubToken() },
      );
      this.logger.log(`review (${submission.event}) submitted on ${prUrl}${result.htmlUrl ? ` → ${result.htmlUrl}` : ''}`);
    } catch (err) {
      throw this.toGatewayError('submit review', err);
    }
    // Flip the batched drafts to `submitted` (kept for history).
    this.drafts.markSubmitted(draftRows.map((d) => d.id));
    this.audit?.record({
      entityType: 'task',
      entityId: taskId,
      userId: author,
      action: 'task.pr_reviewed',
      payload: { event: submission.event, comments: comments.length },
    });
    return this.prStatus.refresh(taskId);
  }

  async mergePr(taskId: string, method: PrMergeMethod, actor: string | null): Promise<Task> {
    const prUrl = this.requirePrUrl(taskId);
    try {
      await mergeGithubPr(prUrl, method, { runGh: this.runGh, getToken: () => this.githubToken() });
      this.logger.log(`merged ${prUrl} (${method})`);
    } catch (err) {
      throw this.toGatewayError('merge PR', err);
    }
    this.audit?.record({
      entityType: 'task',
      entityId: taskId,
      userId: actor,
      action: 'task.pr_merged',
      payload: { method },
    });
    return this.prStatus.refresh(taskId);
  }

  private requirePrUrl(taskId: string): string {
    const row = this.repo.getTask(taskId);
    if (!row) throw new NotFoundException(`task ${taskId} not found`);
    if (!row.prUrl || !parseGithubPr(row.prUrl)) {
      throw new NotFoundException(`task ${taskId} has no GitHub PR`);
    }
    return row.prUrl;
  }

  /** The github workflow credential's token, if one is configured (REST fallback). */
  private async githubToken(): Promise<string | undefined> {
    if (!this.credentials) return undefined;
    const cred = this.credentials.list().find((c) => c.type === 'github');
    if (!cred) return undefined;
    const data = await this.credentials.resolve(cred.id);
    return data?.type === 'github' ? data.token : undefined;
  }

  /** A failed write is the agent's/user's action hitting GitHub — surface the
   *  real message (branch protection, unmergeable, auth) as a 502, not a 500. */
  private toGatewayError(what: string, err: unknown): BadGatewayException {
    const message = err instanceof Error ? err.message : `failed to ${what}`;
    this.logger.warn(`pr-review: ${what} failed: ${message}`);
    return new BadGatewayException(message);
  }

  /** Seam for tests — overridden to avoid shelling out to `gh`. */
  protected get runGh(): GhRunner | undefined {
    return undefined;
  }
}
