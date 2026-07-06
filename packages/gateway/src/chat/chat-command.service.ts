import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type ChatCommandResult,
  type ChatInferencePath,
  type ChatIntent,
  type ChatIntentParse,
  type ChatPreviewResponse,
  type TeamScope,
} from '@midnite/shared';

import { AuditService } from '../audit/audit.service';
import { BreakdownService } from '../agent/breakdown.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { ChatCommandsRepository } from './chat-commands.repository';
import { ChatIntentService } from './chat-intent.service';
import type { RevertOp } from './lib/revert-plan';

/** A resolved reference, or a human reason it couldn't resolve. */
type Resolved = { id: string } | { error: string };

/**
 * What a mutating handler did: a summary + the ids it touched + the inverse ops
 * needed to undo it (Theme F). A failure carries only a spoken summary.
 */
type Outcome =
  | { ok: true; summary: string; affectedIds: string[]; revert: RevertOp[] }
  | { ok: false; summary: string };

function isError(r: Resolved): r is { error: string } {
  return 'error' in r;
}

/**
 * Phase 59 B + F — execute a parsed {@link ChatIntent} by **composing existing
 * services** (no new mutation path): create → `createFromPrompt`/`createBulk`,
 * breakdown → `BreakdownService` + `createTasksFromBreakdown`, priority/status/
 * assign → task update, dependency → `addDependency` (inherits the cycle-check).
 * Team scope + RBAC are inherited from those services.
 *
 * **Safety (Theme F):** a mutating command only writes when `confirm` is true —
 * otherwise `execute` returns `confirmation: 'confirm'` and nothing changes (the
 * NL bar never silently mutates). Every write is logged with an inverse
 * **revert plan** (its `undoToken` reverts it via `POST /chat/undo`) and recorded
 * to the Phase 50 audit trail. Read-only queries run immediately.
 *
 * `execute` never throws for user-input problems (unknown ref, unknown repo,
 * cycle) — it returns a {@link ChatCommandResult} whose `summary` explains what
 * happened, which is the right UX for a chat bar.
 */
@Injectable()
export class ChatCommandService {
  private readonly logger = new Logger(ChatCommandService.name);

  constructor(
    @Inject(ChatIntentService) private readonly intents: ChatIntentService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
    @Inject(ChatCommandsRepository) private readonly log: ChatCommandsRepository,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  /** Parse the text and describe what would happen — no write; surfaces the confirm level. */
  async preview(text: string): Promise<ChatPreviewResponse> {
    const parse = await this.intents.parse(text);
    const willMutate = isMutating(parse.intent);
    return {
      parse,
      description: describeIntent(parse.intent),
      willMutate,
      confirmation: willMutate ? 'confirm' : 'none',
    };
  }

  /**
   * Parse then execute; returns the parse (for the cost line) + the outcome. A
   * mutating intent requires `confirm: true` — without it the command is *not*
   * run and comes back `confirmation: 'confirm'` (the seatbelt).
   */
  async execute(
    text: string,
    scope?: TeamScope,
    confirm = false,
  ): Promise<{ parse: ChatIntentParse; result: ChatCommandResult }> {
    const parse = await this.intents.parse(text);
    const intent = parse.intent;
    // The router (Theme D) already resolved the true cost line — consume it.
    const path = parse.inferencePath;

    if (isMutating(intent) && !confirm) {
      return {
        parse,
        result: {
          summary: `Confirm to run: ${describeIntent(intent)}`,
          affectedIds: [],
          inferencePath: path,
          confirmation: 'confirm',
        },
      };
    }

    const result = await this.run(intent, scope, path, text);
    return { parse, result };
  }

  private async run(
    intent: ChatIntent,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
    text: string,
  ): Promise<ChatCommandResult> {
    // Read-only intents don't produce a revert plan; run + return directly.
    if (intent.type === 'query') {
      return fail('Board questions aren’t answered yet — coming in a follow-up.', path);
    }
    if (intent.type === 'unknown') {
      return fail(intent.reason ?? 'Sorry, I couldn’t understand that command.', path);
    }

    let outcome: Outcome;
    try {
      outcome = await this.perform(intent, scope);
    } catch (err) {
      // Domain errors (unknown repo, cycle, not-found) become a spoken failure
      // rather than an HTTP 500 — the chat bar reads the summary.
      this.logger.warn(
        `chat command (${intent.type}) failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return fail(humanError(err), path);
    }

    if (!outcome.ok) return fail(outcome.summary, path);
    return this.commit(intent, scope, path, text, outcome);
  }

  /** Persist the revert plan (→ undo token) + audit the command, then build the result. */
  private commit(
    intent: ChatIntent,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
    text: string,
    outcome: Extract<Outcome, { ok: true }>,
  ): ChatCommandResult {
    // A command that changed nothing (e.g. bulk create where every line failed)
    // needs no undo token.
    let undoToken: string | undefined;
    if (outcome.revert.length > 0) {
      undoToken = randomUUID();
      this.log.insert({
        id: undoToken,
        userId: scope?.userId ?? null,
        teamId: scope?.teamId ?? null,
        text,
        intentType: intent.type,
        inferencePath: path,
        affectedIds: JSON.stringify(outcome.affectedIds),
        revertPlan: JSON.stringify(outcome.revert),
        createdAt: new Date().toISOString(),
        undoneAt: null,
      });
    }
    this.audit.record({
      entityType: 'task',
      entityId: outcome.affectedIds[0] ?? 'chat',
      userId: scope?.userId ?? null,
      action: 'chat.command',
      payload: { text, intentType: intent.type, affectedIds: outcome.affectedIds, inferencePath: path },
    });
    return {
      summary: outcome.summary,
      affectedIds: outcome.affectedIds,
      ...(undoToken ? { undoToken } : {}),
      inferencePath: path,
      confirmation: 'none',
    };
  }

  /** Dispatch a mutating intent to its handler, producing an {@link Outcome}. */
  private async perform(
    intent: Exclude<ChatIntent, { type: 'query' } | { type: 'unknown' }>,
    scope: TeamScope | undefined,
  ): Promise<Outcome> {
    switch (intent.type) {
      case 'createTask':
        return this.createTask(intent, scope);
      case 'bulkCreate':
        return this.bulkCreate(intent, scope);
      case 'breakdown':
        return this.breakdownGoal(intent, scope);
      case 'setPriority':
        return this.setPriority(intent, scope);
      case 'setStatus':
        return this.setStatus(intent, scope);
      case 'assign':
        return this.assign(intent, scope);
      case 'addDependency':
        return this.addDependency(intent, scope);
    }
  }

  private async createTask(
    intent: Extract<ChatIntent, { type: 'createTask' }>,
    scope: TeamScope | undefined,
  ): Promise<Outcome> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return { ok: false, summary: project.error };
    const task = await this.tasks.createFromPrompt({
      prompt: intent.title,
      repo: intent.repo,
      projectId: project?.id,
      priority: intent.priority,
      images: [],
      createdBy: scope?.userId,
    });
    return {
      ok: true,
      summary: `Created task “${task.title}”.`,
      affectedIds: [task.id],
      revert: [{ kind: 'delete', taskId: task.id }],
    };
  }

  private async bulkCreate(
    intent: Extract<ChatIntent, { type: 'bulkCreate' }>,
    scope: TeamScope | undefined,
  ): Promise<Outcome> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return { ok: false, summary: project.error };
    const res = await this.tasks.createBulk({
      lines: intent.titles,
      repo: intent.repo,
      projectId: project?.id,
      priority: intent.priority,
    });
    const ids = res.results.flatMap((r) => (r.taskId ? [r.taskId] : []));
    const failed = res.counts.failed;
    const summary =
      `Created ${ids.length} task${ids.length === 1 ? '' : 's'}` +
      (failed > 0 ? ` (${failed} failed).` : '.');
    return { ok: true, summary, affectedIds: ids, revert: ids.map((id) => ({ kind: 'delete', taskId: id })) };
  }

  private async breakdownGoal(
    intent: Extract<ChatIntent, { type: 'breakdown' }>,
    scope: TeamScope | undefined,
  ): Promise<Outcome> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return { ok: false, summary: project.error };
    const preview = await this.breakdown.generate({ goal: intent.goal, isProject: false });
    const tasks = this.tasks.createTasksFromBreakdown(preview.breakdown, {
      repo: intent.repo,
      projectId: project?.id,
    });
    const note = preview.isFallback ? ' (AI unavailable — created a single task)' : '';
    const ids = tasks.map((t) => t.id);
    return {
      ok: true,
      summary: `Broke “${intent.goal}” into ${tasks.length} task${tasks.length === 1 ? '' : 's'}${note}.`,
      affectedIds: ids,
      revert: ids.map((id) => ({ kind: 'delete', taskId: id })),
    };
  }

  private setPriority(
    intent: Extract<ChatIntent, { type: 'setPriority' }>,
    scope: TeamScope | undefined,
  ): Outcome {
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return { ok: false, summary: ref.error };
    const before = this.tasks.getTask(ref.id, scope).priority;
    const task = this.tasks.setPriority(ref.id, intent.priority);
    return {
      ok: true,
      summary: `Set “${task.title}” to priority ${intent.priority}.`,
      affectedIds: [task.id],
      revert: [{ kind: 'restorePriority', taskId: task.id, priority: before }],
    };
  }

  private setStatus(
    intent: Extract<ChatIntent, { type: 'setStatus' }>,
    scope: TeamScope | undefined,
  ): Outcome {
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return { ok: false, summary: ref.error };
    const before = this.tasks.getTask(ref.id, scope).status;
    const task = this.tasks.updateStatus(ref.id, intent.status);
    return {
      ok: true,
      summary: `Moved “${task.title}” to ${intent.status}.`,
      affectedIds: [task.id],
      revert: [{ kind: 'restoreStatus', taskId: task.id, status: before }],
    };
  }

  private assign(
    intent: Extract<ChatIntent, { type: 'assign' }>,
    scope: TeamScope | undefined,
  ): Outcome {
    if (intent.milestone != null && intent.repo == null && intent.project == null) {
      // Milestones arrive with Phase 58 D; no assignment target exists yet.
      return { ok: false, summary: 'Milestone assignment isn’t available yet.' };
    }
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return { ok: false, summary: ref.error };
    const before = this.tasks.getTask(ref.id, scope);
    const changes: string[] = [];
    const revert: RevertOp[] = [];
    let task;
    if (intent.repo != null) {
      task = this.tasks.setRepo(ref.id, intent.repo);
      revert.push({ kind: 'restoreRepo', taskId: ref.id, repo: before.repo ?? null });
      changes.push(`repo \`${intent.repo}\``);
    }
    if (intent.project != null) {
      const project = this.resolveProject(intent.project, scope);
      if (project && isError(project)) return { ok: false, summary: project.error };
      task = this.tasks.setProject(ref.id, project ? project.id : null);
      revert.push({ kind: 'restoreProject', taskId: ref.id, projectId: before.projectId ?? null });
      changes.push('project');
    }
    if (intent.milestone != null) changes.push('milestone (skipped — not available yet)');
    if (!task) return { ok: false, summary: 'Nothing to assign.' };
    return {
      ok: true,
      summary: `Assigned “${task.title}” → ${changes.join(', ')}.`,
      affectedIds: [task.id],
      revert,
    };
  }

  private addDependency(
    intent: Extract<ChatIntent, { type: 'addDependency' }>,
    scope: TeamScope | undefined,
  ): Outcome {
    const task = this.resolveTaskRef(intent.task, scope);
    if (isError(task)) return { ok: false, summary: task.error };
    const blocker = this.resolveTaskRef(intent.dependsOn, scope);
    if (isError(blocker)) return { ok: false, summary: blocker.error };
    const updated = this.tasks.addDependency(task.id, blocker.id);
    return {
      ok: true,
      summary: `“${updated.title}” now depends on ${intent.dependsOn}.`,
      affectedIds: [task.id],
      revert: [{ kind: 'removeDependency', taskId: task.id, dependsOnId: blocker.id }],
    };
  }

  /**
   * Resolve a task reference to an id: an exact id match first, else a
   * case-insensitive title match (exact title before a substring). Zero matches
   * or an ambiguous substring return a spoken error — never a guess.
   */
  private resolveTaskRef(ref: string, scope: TeamScope | undefined): Resolved {
    const all = this.tasks.listTasks(undefined, undefined, scope);
    const exactId = all.find((t) => t.id === ref);
    if (exactId) return { id: exactId.id };
    const needle = ref.trim().toLowerCase();
    const exactTitle = all.filter((t) => t.title.toLowerCase() === needle);
    const matches = exactTitle.length > 0 ? exactTitle : all.filter((t) => t.title.toLowerCase().includes(needle));
    if (matches.length === 1) return { id: matches[0]!.id };
    if (matches.length === 0) return { error: `No task matches “${ref}”.` };
    return { error: `“${ref}” matches ${matches.length} tasks — be more specific or use the task id.` };
  }

  /** Resolve a project reference (id or name) to an id; undefined ref → undefined. */
  private resolveProject(ref: string | undefined, scope: TeamScope | undefined): Resolved | undefined {
    if (ref == null || ref.trim() === '') return undefined;
    const all = this.projects.listProjects(scope);
    const byId = all.find((p) => p.id === ref);
    if (byId) return { id: byId.id };
    const needle = ref.trim().toLowerCase();
    const byName = all.filter((p) => p.name.toLowerCase() === needle);
    if (byName.length === 1) return { id: byName[0]!.id };
    if (byName.length === 0) return { error: `No project matches “${ref}”.` };
    return { error: `“${ref}” matches ${byName.length} projects — use the project id.` };
  }
}

/** Whether executing this intent changes board state (drives preview.willMutate). */
export function isMutating(intent: ChatIntent): boolean {
  return intent.type !== 'query' && intent.type !== 'unknown';
}

/** A one-line, human description of a parsed intent for the preview step. */
export function describeIntent(intent: ChatIntent): string {
  switch (intent.type) {
    case 'createTask':
      return `Create task “${intent.title}”${intent.repo ? ` on \`${intent.repo}\`` : ''}${
        intent.priority !== undefined ? ` (p${intent.priority})` : ''
      }.`;
    case 'bulkCreate':
      return `Create ${intent.titles.length} tasks${intent.repo ? ` on \`${intent.repo}\`` : ''}.`;
    case 'breakdown':
      return `Break “${intent.goal}” into tasks.`;
    case 'setPriority':
      return `Set “${intent.task}” to priority ${intent.priority}.`;
    case 'setStatus':
      return `Move “${intent.task}” to ${intent.status}.`;
    case 'assign': {
      const targets = [
        intent.repo && `repo \`${intent.repo}\``,
        intent.project && `project “${intent.project}”`,
        intent.milestone && `milestone “${intent.milestone}”`,
      ].filter(Boolean);
      return `Assign “${intent.task}” → ${targets.join(', ')}.`;
    }
    case 'addDependency':
      return `Make “${intent.task}” depend on “${intent.dependsOn}”.`;
    case 'query':
      return `Answer: ${intent.text}`;
    case 'unknown':
      return intent.reason ?? 'Unrecognised command.';
  }
}

function fail(summary: string, inferencePath: ChatInferencePath): ChatCommandResult {
  return { summary, affectedIds: [], inferencePath, confirmation: 'none' };
}

function humanError(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong running that command.';
}
