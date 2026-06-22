import type { Status, Task } from '@midnite/shared';
import type { ProjectTagInfo } from '@/components/task-card';

export type ColumnDef = { status: Status; label: string; hueVar: string };

/** Shared props for the Board and Table renderers under TasksView. */
export type TaskViewProps = {
  /** Already project-filtered; includes abandoned tasks. */
  tasks: Task[];
  /** Visible status columns/sections (after the status filter). */
  columns: ColumnDef[];
  projectsById: Map<string, ProjectTagInfo>;
  onSelect: (task: Task) => void;
  /** Whether to render the tucked-away "Abandoned" section (true when no status filter is active). */
  showAbandoned: boolean;
  /** Move a task to a new status (board drag-and-drop / Start button). A move to
   *  `wip` from todo/backlog spawns an agent session; other moves just restatus.
   *  Only the board wires this; list/table ignore it. */
  onMove?: (taskId: string, target: Status) => void;
  // Bulk selection (optional; wired by TasksView across all three views).
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
  /** id → unmet blocker count (Phase 27); drives the "Blocked by N" chip + card dim. */
  blockedCounts?: Map<string, number>;
};

/** Group tasks by status into a lookup. */
export function groupByStatus(tasks: Task[]): Map<Status, Task[]> {
  const grouped = new Map<Status, Task[]>();
  for (const t of tasks) {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  }
  return grouped;
}

/** Count of distinct projects represented among a set of tasks. */
export function distinctProjectCount(tasks: Task[]): number {
  const ids = new Set<string>();
  for (const t of tasks) if (t.projectId) ids.add(t.projectId);
  return ids.size;
}

/** The primary status columns shown on the board and as table sections, in order. */
export const COLUMNS: ColumnDef[] = [
  { status: 'backlog', label: 'Backlog', hueVar: '--status-backlog' },
  { status: 'todo', label: 'Todo', hueVar: '--status-todo' },
  { status: 'wip', label: 'In progress', hueVar: '--status-wip' },
  { status: 'waiting', label: 'Waiting', hueVar: '--status-waiting' },
  { status: 'done', label: 'Done', hueVar: '--status-done' },
];

/** Abandoned tasks live in their own tucked-away section, never a primary column. */
export const ABANDONED_COLUMN: ColumnDef = {
  status: 'abandoned',
  label: 'Abandoned',
  hueVar: '--status-abandoned',
};

export const COLUMN_STATUSES = new Set<string>(COLUMNS.map((c) => c.status));

/** Every status (primary columns + abandoned), for label/hue lookups. */
export const ALL_COLUMNS: ColumnDef[] = [...COLUMNS, ABANDONED_COLUMN];

const STATUS_META = new Map(ALL_COLUMNS.map((c) => [c.status, c] as const));

export function statusLabel(status: Status): string {
  return STATUS_META.get(status)?.label ?? status;
}

export function statusHueVar(status: Status): string {
  return STATUS_META.get(status)?.hueVar ?? '--status-backlog';
}
