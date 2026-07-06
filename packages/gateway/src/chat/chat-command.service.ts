import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type ChatCommandResult,
  type ChatInferencePath,
  type ChatIntent,
  type ChatIntentParse,
  type ChatPreviewResponse,
  type TeamScope,
} from '@midnite/shared';

import { BreakdownService } from '../agent/breakdown.service';
import { ProjectsService } from '../projects/projects.service';
import { TasksService } from '../tasks/tasks.service';
import { ChatIntentService } from './chat-intent.service';

/** A resolved reference, or a human reason it couldn't resolve. */
type Resolved = { id: string } | { error: string };

function isError(r: Resolved): r is { error: string } {
  return 'error' in r;
}

/**
 * Phase 59 B — execute a parsed {@link ChatIntent} by **composing existing
 * services** (no new mutation path): create → `createFromPrompt`/`createBulk`,
 * breakdown → `BreakdownService` + `createTasksFromBreakdown`, priority/status/
 * assign → task update, dependency → `addDependency` (inherits the cycle-check).
 * Team scope + RBAC are inherited from those services.
 *
 * `execute` never throws for user-input problems (unknown ref, unknown repo,
 * cycle) — it returns a {@link ChatCommandResult} whose `summary` explains what
 * happened, which is the right UX for a chat bar. Undo (Theme F) and the
 * confirm-gate (Theme F) are not wired here; `preview` is the read-only half.
 */
@Injectable()
export class ChatCommandService {
  private readonly logger = new Logger(ChatCommandService.name);

  constructor(
    @Inject(ChatIntentService) private readonly intents: ChatIntentService,
    @Inject(TasksService) private readonly tasks: TasksService,
    @Inject(BreakdownService) private readonly breakdown: BreakdownService,
    @Inject(ProjectsService) private readonly projects: ProjectsService,
  ) {}

  /** Parse the text and describe what would happen — no write (Theme F gates confirm). */
  async preview(text: string): Promise<ChatPreviewResponse> {
    const parse = await this.intents.parse(text);
    return {
      parse,
      description: describeIntent(parse.intent),
      willMutate: isMutating(parse.intent),
    };
  }

  /** Parse then execute; returns the parse (for the cost line) + the outcome. */
  async execute(
    text: string,
    scope?: TeamScope,
  ): Promise<{ parse: ChatIntentParse; result: ChatCommandResult }> {
    const parse = await this.intents.parse(text);
    // The router (Theme D) already resolved the true cost line — including which
    // provider it actually used — so consume it rather than re-deriving from the
    // active provider (which is wrong when a local override fired).
    const result = await this.run(parse.intent, scope, parse.inferencePath);
    return { parse, result };
  }

  private async run(
    intent: ChatIntent,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): Promise<ChatCommandResult> {
    try {
      switch (intent.type) {
        case 'createTask':
          return await this.createTask(intent, scope, path);
        case 'bulkCreate':
          return await this.bulkCreate(intent, scope, path);
        case 'breakdown':
          return await this.breakdownGoal(intent, scope, path);
        case 'setPriority':
          return this.setPriority(intent, scope, path);
        case 'setStatus':
          return this.setStatus(intent, scope, path);
        case 'assign':
          return this.assign(intent, scope, path);
        case 'addDependency':
          return this.addDependency(intent, scope, path);
        case 'query':
          return fail('Board questions aren’t answered yet — coming in a follow-up.', path);
        case 'unknown':
          return fail(intent.reason ?? 'Sorry, I couldn’t understand that command.', path);
      }
    } catch (err) {
      // Domain errors (unknown repo, cycle, not-found) become a spoken failure
      // rather than an HTTP 500 — the chat bar reads the summary.
      this.logger.warn(
        `chat command (${intent.type}) failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return fail(humanError(err), path);
    }
  }

  private async createTask(
    intent: Extract<ChatIntent, { type: 'createTask' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): Promise<ChatCommandResult> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return fail(project.error, path);
    const task = await this.tasks.createFromPrompt({
      prompt: intent.title,
      repo: intent.repo,
      projectId: project?.id,
      priority: intent.priority,
      images: [],
      createdBy: scope?.userId,
    });
    return { summary: `Created task “${task.title}”.`, affectedIds: [task.id], inferencePath: path };
  }

  private async bulkCreate(
    intent: Extract<ChatIntent, { type: 'bulkCreate' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): Promise<ChatCommandResult> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return fail(project.error, path);
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
    return { summary, affectedIds: ids, inferencePath: path };
  }

  private async breakdownGoal(
    intent: Extract<ChatIntent, { type: 'breakdown' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): Promise<ChatCommandResult> {
    const project = this.resolveProject(intent.project, scope);
    if (project && isError(project)) return fail(project.error, path);
    const preview = await this.breakdown.generate({ goal: intent.goal, isProject: false });
    const tasks = this.tasks.createTasksFromBreakdown(preview.breakdown, {
      repo: intent.repo,
      projectId: project?.id,
    });
    const note = preview.isFallback ? ' (AI unavailable — created a single task)' : '';
    return {
      summary: `Broke “${intent.goal}” into ${tasks.length} task${tasks.length === 1 ? '' : 's'}${note}.`,
      affectedIds: tasks.map((t) => t.id),
      inferencePath: path,
    };
  }

  private setPriority(
    intent: Extract<ChatIntent, { type: 'setPriority' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): ChatCommandResult {
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return fail(ref.error, path);
    const task = this.tasks.setPriority(ref.id, intent.priority);
    return {
      summary: `Set “${task.title}” to priority ${intent.priority}.`,
      affectedIds: [task.id],
      inferencePath: path,
    };
  }

  private setStatus(
    intent: Extract<ChatIntent, { type: 'setStatus' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): ChatCommandResult {
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return fail(ref.error, path);
    const task = this.tasks.updateStatus(ref.id, intent.status);
    return {
      summary: `Moved “${task.title}” to ${intent.status}.`,
      affectedIds: [task.id],
      inferencePath: path,
    };
  }

  private assign(
    intent: Extract<ChatIntent, { type: 'assign' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): ChatCommandResult {
    if (intent.milestone != null && intent.repo == null && intent.project == null) {
      // Milestones arrive with Phase 58 D; no assignment target exists yet.
      return fail('Milestone assignment isn’t available yet.', path);
    }
    const ref = this.resolveTaskRef(intent.task, scope);
    if (isError(ref)) return fail(ref.error, path);
    const changes: string[] = [];
    let task;
    if (intent.repo != null) {
      task = this.tasks.setRepo(ref.id, intent.repo);
      changes.push(`repo \`${intent.repo}\``);
    }
    if (intent.project != null) {
      const project = this.resolveProject(intent.project, scope);
      if (project && isError(project)) return fail(project.error, path);
      task = this.tasks.setProject(ref.id, project ? project.id : null);
      changes.push('project');
    }
    if (intent.milestone != null) changes.push('milestone (skipped — not available yet)');
    if (!task) return fail('Nothing to assign.', path);
    return {
      summary: `Assigned “${task.title}” → ${changes.join(', ')}.`,
      affectedIds: [task.id],
      inferencePath: path,
    };
  }

  private addDependency(
    intent: Extract<ChatIntent, { type: 'addDependency' }>,
    scope: TeamScope | undefined,
    path: ChatInferencePath,
  ): ChatCommandResult {
    const task = this.resolveTaskRef(intent.task, scope);
    if (isError(task)) return fail(task.error, path);
    const blocker = this.resolveTaskRef(intent.dependsOn, scope);
    if (isError(blocker)) return fail(blocker.error, path);
    const updated = this.tasks.addDependency(task.id, blocker.id);
    return {
      summary: `“${updated.title}” now depends on ${intent.dependsOn}.`,
      affectedIds: [task.id],
      inferencePath: path,
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
  return { summary, affectedIds: [], inferencePath };
}

function humanError(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong running that command.';
}
