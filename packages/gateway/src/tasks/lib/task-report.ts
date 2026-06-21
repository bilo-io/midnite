/**
 * Pure markdown serializer for a task — a second consumer of the report export
 * framework (`shared/src/report.ts`), mirroring the council serializer
 * (`councils/lib/council-report.ts`). Given a hydrated `Task` it builds a clean,
 * self-contained document:
 *
 *   # <title>
 *   *Exported …*
 *   - **Kind/Status/Priority/Repo/Project/PR/Tags** metadata
 *   ## Prompt           (when the task carries one)
 *   ## Timeline         (the task_events history, oldest → newest)
 *   ## Links            (attached source links, if any)
 *
 * It has no DB or Nest dependency: the caller (the service) hands it an already-
 * hydrated `Task` (which embeds `events` and `links`), so it stays trivially
 * unit-testable. Pure: same input → same output (modulo the injectable `now`).
 */

import type { Task, TaskEvent } from '@midnite/shared';

const PRIORITY_LABEL: Record<number, string> = {
  0: 'Low',
  1: 'Normal',
  2: 'High',
  3: 'Urgent',
};

export type TaskReportOptions = {
  /** When the report is generated; defaults to now. Injectable for stable tests. */
  now?: Date;
};

/** A compact one-line summary of an event's `data` payload, or '' when empty. */
function eventDataSummary(data: TaskEvent['data']): string {
  if (!data) return '';
  const parts = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  return parts.join(', ');
}

/** Render the `task_events` history as a markdown bullet list, oldest → newest. */
function renderTimeline(events: TaskEvent[]): string {
  if (events.length === 0) return '_No activity recorded._';
  return [...events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => {
      const summary = eventDataSummary(e.data);
      return `- \`${e.at}\` **${e.kind}**${summary ? ` — ${summary}` : ''}`;
    })
    .join('\n');
}

/**
 * Serialize a task thread as a standalone markdown document. Pure: same inputs →
 * same output (modulo the `now` timestamp, which is injectable).
 */
export function buildTaskReport(task: Task, options: TaskReportOptions = {}): string {
  const now = options.now ?? new Date();

  const title = `# ${task.title.trim() || 'Untitled task'}`;
  const exportedAt = `*Exported ${now.toISOString().slice(0, 10)}*`;

  const meta: string[] = [
    `- **Kind:** ${task.kind ?? 'unknown'}`,
    `- **Status:** ${task.status}`,
    `- **Priority:** ${PRIORITY_LABEL[task.priority] ?? String(task.priority)}`,
  ];
  if (task.repo) meta.push(`- **Repo:** ${task.repo}`);
  if (task.projectId) meta.push(`- **Project:** ${task.projectId}`);
  if (task.prUrl) meta.push(`- **PR:** ${task.prUrl}`);
  if (task.tags.length > 0) meta.push(`- **Tags:** ${task.tags.join(', ')}`);

  const sections: string[] = [title, exportedAt, meta.join('\n')];

  if (task.prompt?.trim()) {
    sections.push(['## Prompt', task.prompt.trim()].join('\n\n'));
  }

  sections.push(['## Timeline', renderTimeline(task.events)].join('\n\n'));

  const links = task.links ?? [];
  if (links.length > 0) {
    const rows = links.map((l) => `- [${l.label?.trim() || l.url}](${l.url})`).join('\n');
    sections.push(['## Links', rows].join('\n\n'));
  }

  // A single trailing newline — POSIX-clean text file.
  return `${sections.join('\n\n')}\n`;
}

/** A safe, descriptive download filename for a task report. */
export function taskReportFilename(task: Task, options: TaskReportOptions = {}): string {
  const now = options.now ?? new Date();
  const slug =
    (task.title.trim() || 'task')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'task';
  const date = (task.updatedAt ?? task.createdAt ?? now.toISOString()).slice(0, 10);
  return `${slug}-${date}.md`;
}
