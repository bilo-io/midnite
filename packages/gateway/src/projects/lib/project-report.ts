/**
 * Pure markdown serializer for a project — the second consumer of the report
 * export framework (`shared/src/report.ts`). Given a project and its related
 * data, it builds a clean, self-contained document:
 *
 *   # <project name>
 *   *Exported …*
 *   <description if present>
 *   ## Tasks by status (only statuses that have tasks)
 *   ## Sources (if any)
 *   ## Knowledge / Memories (if any)
 *
 * No DB or Nest dependency — the caller hands it already-hydrated shapes so
 * it stays trivially unit-testable.
 */

import type { Memory, Project, ProjectSource, Task } from '@midnite/shared';

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  wip: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  abandoned: 'Abandoned',
};

const STATUS_ORDER = ['backlog', 'todo', 'wip', 'waiting', 'done', 'abandoned'];

function renderTasksSection(tasks: Task[]): string {
  if (tasks.length === 0) return '';
  const byStatus = new Map<string, Task[]>();
  for (const t of tasks) {
    const group = byStatus.get(t.status) ?? [];
    group.push(t);
    byStatus.set(t.status, group);
  }
  const sections: string[] = ['## Tasks'];
  for (const status of STATUS_ORDER) {
    const group = byStatus.get(status);
    if (!group?.length) continue;
    sections.push(`### ${STATUS_LABELS[status] ?? status}`);
    sections.push(
      group
        .map((t) => {
          const parts = [`**${t.title.trim()}**`];
          if (t.kind) parts.push(t.kind);
          if (t.repo) parts.push(`\`${t.repo}\``);
          return `- ${parts.join(' · ')}`;
        })
        .join('\n'),
    );
  }
  return sections.join('\n\n');
}

function renderSourcesSection(sources: ProjectSource[]): string {
  if (sources.length === 0) return '';
  const lines = sources.map((s) => {
    const label = (s.title ?? s.url).trim();
    return `- [${label}](${s.url})`;
  });
  return ['## Sources', lines.join('\n')].join('\n\n');
}

function renderMemoriesSection(memories: Memory[]): string {
  if (memories.length === 0) return '';
  const items = memories
    .map((m) => {
      const title = m.title.trim();
      const content = m.content.trim();
      return title ? `### ${title}\n\n${content}` : content;
    })
    .filter(Boolean);
  if (items.length === 0) return '';
  return ['## Knowledge', items.join('\n\n---\n\n')].join('\n\n');
}

export type ProjectReportOptions = {
  /** When the report is generated; defaults to now. Injectable for stable tests. */
  now?: Date;
};

/**
 * Serialize a project and its related data as a standalone markdown document.
 * Pure: same inputs → same output (modulo the `now` timestamp, injectable).
 */
export function projectToMarkdown(
  project: Project,
  tasks: Task[],
  memories: Memory[],
  options: ProjectReportOptions = {},
): string {
  const now = options.now ?? new Date();
  const title = `# ${project.name.trim() || 'Project'}`;
  const exportedAt = `*Exported ${now.toISOString().slice(0, 10)}*`;

  const sections: string[] = [title, exportedAt];

  if (project.description?.trim()) {
    sections.push(project.description.trim());
  }

  const tasksSection = renderTasksSection(tasks);
  if (tasksSection) sections.push(tasksSection);

  const sourcesSection = renderSourcesSection(project.sources);
  if (sourcesSection) sections.push(sourcesSection);

  const memoriesSection = renderMemoriesSection(memories);
  if (memoriesSection) sections.push(memoriesSection);

  return `${sections.join('\n\n')}\n`;
}

/** A safe, descriptive download filename for a project report. */
export function projectReportFilename(project: Project): string {
  const slug = (project.name.trim() || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'project'}-${date}.md`;
}
