import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { parseGithubPr, type PrDiff } from '@midnite/shared';
import { fetchGithubPrDiff, parseUnifiedDiff } from './lib/github-diff';
import { TasksRepository } from './tasks.repository';

type PrDiffAiReview = PrDiff['aiReview'];

/**
 * Phase 52 Theme A — resolve a task's GitHub PR (from its `prUrl`) to a
 * **structured** {@link PrDiff} for the in-app review viewer. The fetch ladder +
 * unified-diff parsing live in `lib/github-diff` (shared with the workflow
 * `github.get-diff` executor); this service owns the task lookup and the HTTP
 * error mapping. Fetch is **fail-open**: when every source fails it maps to a 503
 * the web renders as a retry banner, never breaking the task view.
 */
@Injectable()
export class PrDiffService {
  private readonly logger = new Logger(PrDiffService.name);

  constructor(@Inject(TasksRepository) private readonly repo: TasksRepository) {}

  async getDiffForTask(taskId: string): Promise<PrDiff> {
    const row = this.repo.getTask(taskId);
    if (!row) throw new NotFoundException(`task ${taskId} not found`);
    if (!row.prUrl || !parseGithubPr(row.prUrl)) {
      throw new NotFoundException(`task ${taskId} has no GitHub PR`);
    }

    const raw = await this.fetchRaw(row.prUrl);
    if (raw === null) {
      this.logger.warn(`pr-diff: could not fetch diff for task ${taskId} (${row.prUrl})`);
      throw new ServiceUnavailableException('could not fetch the PR diff — try again');
    }

    const parsed = parseUnifiedDiff(raw);
    return {
      prUrl: row.prUrl,
      ...parsed,
      fetchedAt: new Date().toISOString(),
      aiReview: this.parseAiReview(row.aiReview),
    };
  }

  /** The task row stores `ai_review` as a JSON string; pluck the fields the diff
   *  banner needs (verdict + summary + reviewedAt), null on absent/malformed. */
  private parseAiReview(raw: string | null | undefined): PrDiffAiReview {
    if (!raw) return null;
    try {
      const v = JSON.parse(raw) as { verdict?: unknown; summary?: unknown; reviewedAt?: unknown };
      if (
        (v.verdict === 'approved' || v.verdict === 'commented' || v.verdict === 'changes-requested') &&
        typeof v.summary === 'string' &&
        typeof v.reviewedAt === 'string'
      ) {
        return { verdict: v.verdict, summary: v.summary, reviewedAt: v.reviewedAt };
      }
    } catch {
      // malformed — treat as no review
    }
    return null;
  }

  /** Seam for tests — the task endpoint fetches without a stored token (gh + anon). */
  protected fetchRaw(prUrl: string): Promise<string | null> {
    return fetchGithubPrDiff(prUrl);
  }
}
