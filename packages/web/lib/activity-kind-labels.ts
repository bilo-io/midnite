import { useTranslations } from 'next-intl';

/**
 * Reader-facing wording for a task event's `kind` (Phase 82 Theme D, dashboard round 2).
 *
 * `TaskActivityEntry.kind` is `z.string()` in `@midnite/shared` — deliberately **open**,
 * because the gateway appends event kinds without a client release. The activity feed
 * used to render them through a local `humanizeKind()` (`task.details.changed` →
 * `Task details changed`), which is English in every locale and, being a call inside a
 * JSX expression, invisible to the `jsx-text-only` gate.
 *
 * So this is an allowlist, not an enum: {@link ACTIVITY_KINDS} enumerates the kinds
 * `tasks.service.ts` / `tasks.repository.ts` actually insert today (plus three legacy
 * kinds still present in older databases), each with a catalog key. Anything else — a
 * kind a newer gateway invented — falls back to {@link humanizeKind}, so an unrecognised
 * event degrades to readable English rather than a raw key path or a throw. The
 * registry sweep in `i18n-dashboard-registry.test.ts` pins the known set in both locales.
 */
export const ACTIVITY_KINDS = [
  'agent.done',
  'agent.escalated',
  'agent.failed',
  'agent.requeued',
  'agent.resumed',
  'agent.retried',
  'agent.started',
  'agent.waiting',
  'link.added',
  'status.changed',
  'task.archived',
  'task.created',
  'task.details.changed',
  'task.milestone.changed',
  'task.priority.changed',
  'task.project.changed',
  'task.reopened',
  'task.replanned',
  'task.repo.changed',
  'task.tags.changed',
  'task.unarchived',
  // Legacy kinds: written by earlier gateway versions and still sitting in existing
  // task_events rows, so a long-lived install's feed shows them.
  'commented',
  'created',
  'moved',
] as const;

/**
 * The pre-i18n rendering: split on separators and sentence-case. Still the fallback for
 * kinds outside {@link ACTIVITY_KINDS} — English, but readable.
 */
export function humanizeKind(kind: string): string {
  const text = kind.replace(/[._-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * `task.details.changed` → `taskDetailsChanged`. The dots are camel-cased away because
 * next-intl reads a dot as catalog *nesting* — keeping them would bury each kind under
 * `activity.kinds.task.details.changed`, splitting one flat list into a tree that mixes
 * leaves and branches at the same level (`created` beside `task`).
 */
export function activityKindKey(kind: string): string {
  return kind.replace(/[._-]+(.)/g, (_, c: string) => c.toUpperCase());
}

export function useActivityKindLabel(): (kind: string) => string {
  const t = useTranslations('dashboard');
  return (kind) => {
    const key = `activity.kinds.${activityKindKey(kind)}`;
    return t.has(key) ? t(key) : humanizeKind(kind);
  };
}
