import { checkbox, confirm, input, password, search, select } from '@inquirer/prompts';
import { STATUSES, type Status, type TaskSummary } from '@midnite/shared';

/**
 * Interactive-prompt helpers (Phase 47 Theme D). All guided flows funnel through
 * here so the TTY gate + fallbacks are consistent. Prompts require a real TTY on
 * *both* stdin and stdout; when that's missing (piped / CI / `--json`), a prompt
 * that's standing in for a required value throws {@link NonInteractiveError}
 * instead of hanging on a dead stdin (Decision §5).
 *
 * `NO_COLOR` deliberately does *not* gate prompts — it's a colour convention, not
 * an interactivity one; you can want a guided flow with colour off.
 */
export class NonInteractiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonInteractiveError';
  }
}

/** True only when both stdin and stdout are TTYs — the bar for a real prompt. */
export function canPrompt(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Require interactivity for a flow that has no non-interactive fallback. */
function requireTty(what: string): void {
  if (!canPrompt()) throw new NonInteractiveError(what);
}

/** Yes/no confirm (default no). Non-interactive → `fallback` (default false). */
export async function confirmPrompt(message: string, fallback = false): Promise<boolean> {
  if (!canPrompt()) return fallback;
  return confirm({ message, default: false });
}

/** Masked password prompt. */
export async function passwordPrompt(message = 'Password'): Promise<string> {
  requireTty('a password is required (run in a terminal, or pass --password)');
  return password({ message, mask: true });
}

/** Free-text prompt; `required` rejects an empty answer. */
export async function textPrompt(
  message: string,
  opts: { required?: boolean; default?: string } = {},
): Promise<string> {
  requireTty(`"${message}" is required (non-interactive)`);
  const answer = await input({
    message,
    default: opts.default,
    validate: opts.required ? (v) => v.trim().length > 0 || 'required' : undefined,
  });
  return answer.trim();
}

/** Optional free-text — empty answer becomes `undefined`. */
export async function optionalTextPrompt(message: string): Promise<string | undefined> {
  const v = await textPrompt(`${message} (optional)`, {});
  return v.length > 0 ? v : undefined;
}

/** Fuzzy task picker over the supplied tasks; returns the chosen task id. */
export async function pickTask(tasks: TaskSummary[], message = 'Pick a task'): Promise<string> {
  requireTty('a task id is required (non-interactive — pass the id)');
  if (tasks.length === 0) throw new Error('no tasks to choose from');
  return search<string>({
    message,
    source: (term) => {
      const q = (term ?? '').toLowerCase();
      return tasks
        .filter((t) => !q || t.title.toLowerCase().includes(q) || t.id.startsWith(q))
        .slice(0, 25)
        .map((t) => ({ name: `${t.title}  [${t.status}]`, value: t.id, description: t.id }));
    },
  });
}

/** Multi-select task picker (e.g. choosing blockers); returns chosen ids. */
export async function pickTasks(tasks: TaskSummary[], message: string): Promise<string[]> {
  requireTty('task ids are required (non-interactive)');
  if (tasks.length === 0) return [];
  return checkbox<string>({
    message,
    choices: tasks.slice(0, 50).map((t) => ({ name: `${t.title}  [${t.status}]`, value: t.id })),
  });
}

/** Status picker (the task state machine's statuses). */
export async function selectStatus(message = 'Move to'): Promise<Status> {
  requireTty('a status is required (non-interactive)');
  return select<Status>({
    message,
    choices: STATUSES.map((s) => ({ name: s, value: s })),
  });
}

/** Priority picker (0–3, default 1). */
export async function selectPriority(message = 'Priority'): Promise<number> {
  requireTty('a priority is required (non-interactive)');
  return select<number>({
    message,
    default: 1,
    choices: [
      { name: '0 — lowest', value: 0 },
      { name: '1 — normal', value: 1 },
      { name: '2 — high', value: 2 },
      { name: '3 — urgent', value: 3 },
    ],
  });
}
