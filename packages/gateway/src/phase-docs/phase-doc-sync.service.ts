import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import type { Task, TaskBoardEvent } from '@midnite/shared';
import { TaskEventBus } from '../tasks/task-event-bus';
import { ProjectsService } from '../projects/projects.service';
import { ReposService } from '../repos/repos.service';
import { PhaseDocsService, PhaseDocConflictError } from './phase-docs.service';
import { setChecklistItem } from './lib/checklist';

const PHASE_DOC_TAG = 'phase-doc:';
const PHASE_ITEM_TAG = 'phase-item:';
const MAX_CONFLICT_RETRIES = 3;

type PendingDoc = {
  ownerRepo: string;
  filename: string;
  /** anchor → desired checked state. */
  items: Map<string, boolean>;
  timer?: ReturnType<typeof setTimeout>;
};

/**
 * Phase 40 Theme G — phase-doc ↔ board sync-back. Subscribes to the `TaskEventBus`
 * (mirroring `SearchService`; `tasks.service` is never touched) and, as seeded tasks
 * reach `done`, ticks their `- [ ]` → `- [x]` checkbox in the project's GitHub phase
 * doc (and un-ticks on reopen). Entirely **best-effort**: any failure logs a `warn`
 * once and never blocks the task transition.
 *
 * - **Repo**: from the project's `phaseDocSyncRepoId` (per-project sync target) →
 *   `ownerRepo` via `ReposService`. Disabled (`phaseDocSync === false`) or unset → skip.
 * - **Idempotent**: reconciles desired state (`status === 'done'`) against the live
 *   line; if already correct, no commit. Needs no previous-status tracking.
 * - **Coalesced + serialized**: a burst of completions on one doc debounces into a
 *   single read-modify-write; writes to a given doc run one-at-a-time, with a bounded
 *   stale-SHA (409) refetch-and-retry.
 */
@Injectable()
export class PhaseDocSyncService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PhaseDocSyncService.name);
  private unsubscribe?: () => void;
  private readonly pending = new Map<string, PendingDoc>();
  private readonly chains = new Map<string, Promise<unknown>>();
  /** Debounce window (ms) for coalescing a burst of completions into one commit. */
  protected debounceMs = 400;

  constructor(
    @Inject(TaskEventBus) private readonly taskBus: TaskEventBus,
    @Inject(PhaseDocsService) private readonly docs: PhaseDocsService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ReposService) private readonly repos: ReposService,
  ) {}

  onApplicationBootstrap(): void {
    this.unsubscribe = this.taskBus.subscribe((event) => this.onEvent(event));
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    for (const p of this.pending.values()) if (p.timer) clearTimeout(p.timer);
  }

  private onEvent(event: TaskBoardEvent): void {
    if (event.type !== 'task.updated') return;
    try {
      this.record(event.task);
    } catch (err) {
      // Resolution failed (e.g. project/repo gone) — never let it bubble into a transition.
      this.logger.warn(`phase-doc sync skipped: ${(err as Error).message}`);
    }
  }

  /** Resolve a tagged task to a (doc, anchor, desired) and queue a debounced flush. */
  private record(task: Task): void {
    const tags: string[] = task.tags ?? [];
    const docTag = tags.find((t) => t.startsWith(PHASE_DOC_TAG));
    const itemTag = tags.find((t) => t.startsWith(PHASE_ITEM_TAG));
    if (!docTag || !itemTag || !task.projectId) return;

    const project = this.projects.getProject(task.projectId);
    if (project.phaseDocSync === false) return; // toggled off for this project
    const repoId = project.phaseDocSyncRepoId;
    if (!repoId) return; // no sync target configured
    const ownerRepo = this.repos.get(repoId).ownerRepo;
    if (!ownerRepo) return; // repo has no GitHub owner/repo

    const filename = docTag.slice(PHASE_DOC_TAG.length);
    const anchor = itemTag.slice(PHASE_ITEM_TAG.length);
    const desired = task.status === 'done';
    const docKey = `${ownerRepo}::${filename}`;

    let p = this.pending.get(docKey);
    if (!p) {
      p = { ownerRepo, filename, items: new Map() };
      this.pending.set(docKey, p);
    }
    p.items.set(anchor, desired);
    if (p.timer) clearTimeout(p.timer);
    p.timer = setTimeout(() => void this.flush(docKey), this.debounceMs);
  }

  /** Serialize writes to a given doc through a per-doc promise chain. */
  private flush(docKey: string): Promise<void> {
    const prev = this.chains.get(docKey) ?? Promise.resolve();
    const next = prev
      .then(() => this.doFlush(docKey))
      .catch((err: unknown) => {
        this.logger.warn(
          `phase-doc sync write failed for ${docKey}: ${(err as Error).message}`,
        );
      });
    this.chains.set(docKey, next);
    return next;
  }

  private async doFlush(docKey: string): Promise<void> {
    const p = this.pending.get(docKey);
    if (!p || p.items.size === 0) return;
    this.pending.delete(docKey);
    if (p.timer) clearTimeout(p.timer);
    const items = [...p.items.entries()];

    for (let attempt = 0; ; attempt++) {
      const doc = await this.docs.get(p.ownerRepo, p.filename);
      let content = doc.content;
      let changed = false;
      for (const [anchor, desired] of items) {
        const res = setChecklistItem(content, anchor, desired);
        if (!res.matched) {
          this.logger.warn(
            `phase-doc sync: no line matched anchor "${anchor}" in ${p.filename} — skipped`,
          );
          continue;
        }
        if (res.changed) {
          content = res.content;
          changed = true;
        }
      }
      if (!changed) return; // idempotent: every line already in the desired state
      try {
        await this.docs.update(p.ownerRepo, p.filename, content, doc.sha);
        return;
      } catch (err) {
        if (err instanceof PhaseDocConflictError && attempt < MAX_CONFLICT_RETRIES) {
          continue; // stale SHA — refetch and retry
        }
        throw err;
      }
    }
  }

  /**
   * Test/flush seam: force any pending writes immediately, bypassing the debounce,
   * and await them. Production drives flushes via the debounce timer.
   */
  async flushNow(): Promise<void> {
    const keys = [...this.pending.keys()];
    for (const k of keys) {
      const p = this.pending.get(k);
      if (p?.timer) clearTimeout(p.timer);
    }
    await Promise.all(keys.map((k) => this.flush(k)));
    await Promise.all([...this.chains.values()]);
  }
}
