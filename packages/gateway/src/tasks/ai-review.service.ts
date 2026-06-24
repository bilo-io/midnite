import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { WorkflowEvent } from '@midnite/shared';
import { WorkflowEventBus } from '../workflows/workflow-event-bus';
import { TasksRepository } from './tasks.repository';
import { TaskEventBus } from './task-event-bus';

type AiReviewVerdict = 'approved' | 'commented' | 'changes-requested';

// Maps the github.post-review `event` param to a task-level verdict.
const EVENT_TO_VERDICT: Record<string, AiReviewVerdict> = {
  APPROVE: 'approved',
  COMMENT: 'commented',
  REQUEST_CHANGES: 'changes-requested',
};

/**
 * Subscribes to completed workflow runs (Phase 37 Theme D2). When a run that
 * included a `github.post-review` node finishes, this service finds the task
 * whose `prUrl` matches the PR and writes `ai_review` to it, then re-emits
 * `task.updated` so the board chip refreshes without a manual reload.
 *
 * Matching is best-effort: if no task has the matching prUrl, the review is
 * logged and silently dropped (the run result stays in the workflow run store).
 */
@Injectable()
export class AiReviewService implements OnModuleInit {
  private readonly logger = new Logger(AiReviewService.name);
  private unsubscribe?: () => void;

  constructor(
    @Inject(WorkflowEventBus) private readonly workflowBus: WorkflowEventBus,
    @Inject(TasksRepository) private readonly tasks: TasksRepository,
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.workflowBus.subscribe((event) => this.handleEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  private handleEvent(event: WorkflowEvent): void {
    if (event.type !== 'run.finished') return;

    const { run } = event;
    // Find the last github.post-review node run that succeeded.
    const reviewNodeRun = [...run.nodeRuns]
      .reverse()
      .find((n) => n.nodeType === 'github.post-review' && n.status === 'succeeded');
    if (!reviewNodeRun) return;

    // Extract the PR URL from the trigger input (GitHub webhook shape).
    const input = run.input as Record<string, unknown> | undefined;
    const prUrl =
      (input?.pull_request as Record<string, unknown> | undefined)?.html_url;
    if (typeof prUrl !== 'string') return;

    // Find the task by PR URL (exact match; normalised on write in Phase 22).
    const taskRow = this.tasks.findByPrUrl(prUrl);
    if (!taskRow) {
      this.logger.debug(`ai-review: no task with prUrl ${prUrl} — skipping`);
      return;
    }

    // Derive verdict from the review event param (stored in resolvedParams).
    const resolvedParams = reviewNodeRun.resolvedParams as Record<string, unknown> | undefined;
    const reviewEvent = typeof resolvedParams?.event === 'string' ? resolvedParams.event : 'COMMENT';
    const verdict: AiReviewVerdict = EVENT_TO_VERDICT[reviewEvent] ?? 'commented';

    // Use the node's output body as the summary (first 300 chars).
    const output = reviewNodeRun.output as Record<string, unknown> | undefined;
    const fullBody =
      typeof output?.htmlUrl === 'string' ? output.htmlUrl : '';
    const reviewBody =
      (resolvedParams?.body as string | undefined) ?? '';
    const summary = reviewBody.slice(0, 300);

    const reviewedAt = reviewNodeRun.finishedAt ?? new Date().toISOString();
    const updatedAt = new Date().toISOString();

    this.tasks.setAiReview(taskRow.id, { verdict, summary, runId: run.id, reviewedAt }, updatedAt);
    this.logger.log(`ai-review: set verdict=${verdict} on task ${taskRow.id} (${prUrl})`);

    // Re-emit task.updated so WS clients refresh the board chip.
    const hydrated = this.tasks.hydrate(this.tasks.getTask(taskRow.id)!);
    this.taskBus.emit({ type: 'task.updated', at: updatedAt, task: hydrated });

    void fullBody; // suppress unused-var — the htmlUrl is in the output but we don't store it here
  }
}
