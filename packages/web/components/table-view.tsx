'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';
import type { Status, Task } from '@midnite/shared';
import { ProjectTag } from '@/components/project-tag';
import { AbandonedRow } from '@/components/abandoned-row';
import type { ProjectTagInfo } from '@/components/task-card';
import {
  COLUMNS,
  type ColumnDef,
  type TaskViewProps,
  distinctProjectCount,
  groupByStatus,
} from '@/components/task-columns';
import { cn } from '@/lib/utils';

const ORDER_KEY = 'midnite.tasks.sectionOrder';
const COLLAPSED_KEY = 'midnite.tasks.collapsed';
const DEFAULT_ORDER = COLUMNS.map((c) => c.status);

const KIND_LABELS: Record<NonNullable<Task['kind']>, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};
const KIND_HUE_VARS: Record<NonNullable<Task['kind']>, string> = {
  bug: '--kind-bug',
  feature: '--kind-feature',
  question: '--kind-question',
  chore: '--kind-chore',
  unknown: '--kind-unknown',
};

function readStored<T>(key: string, fallback: T, parse: (raw: string) => T | null): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return parse(raw) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Table layout for the Tasks page: each status is a collapsible accordion section
 * acting as a column delimiter, with task rows beneath. Sections can be reordered
 * by dragging their grip handle; the order and collapsed state persist in
 * localStorage. Task rows are not draggable — task status follows the Claude
 * session, not manual moves. Presentational; filtering/modal live in TasksView.
 */
export function TableView({ tasks, columns, projectsById, onSelect, showAbandoned }: TaskViewProps) {
  const grouped = groupByStatus(tasks);
  const columnsByStatus = useMemo(
    () => new Map(columns.map((c) => [c.status, c] as const)),
    [columns],
  );

  // Persisted full ordering across all primary statuses; visible sections are
  // derived from it so reordering survives status filtering.
  const [order, setOrder] = useState<Status[]>(DEFAULT_ORDER);
  const [collapsed, setCollapsed] = useState<Set<Status>>(new Set());

  useEffect(() => {
    setOrder(
      readStored<Status[]>(ORDER_KEY, DEFAULT_ORDER, (raw) => {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        const stored = parsed.filter((s): s is Status => DEFAULT_ORDER.includes(s as Status));
        // Reset if the stored order doesn't cover exactly the known statuses.
        if (stored.length !== DEFAULT_ORDER.length) return null;
        return stored;
      }),
    );
    setCollapsed(
      readStored<Set<Status>>(COLLAPSED_KEY, new Set(), (raw) => {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return null;
        return new Set(parsed.filter((s): s is Status => DEFAULT_ORDER.includes(s as Status)));
      }),
    );
  }, []);

  const persistOrder = (next: Status[]) => {
    setOrder(next);
    try {
      window.localStorage.setItem(ORDER_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private mode); ordering is best-effort.
    }
  };

  const toggleCollapsed = (status: Status) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...next]));
      } catch {
        // best-effort
      }
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id as Status);
    const to = order.indexOf(over.id as Status);
    if (from === -1 || to === -1) return;
    persistOrder(arrayMove(order, from, to));
  };

  // Visible, ordered sections (status filter limits which columns appear).
  const visible = order
    .map((status) => columnsByStatus.get(status))
    .filter((c): c is ColumnDef => Boolean(c));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((c) => c.status)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {visible.map((col) => (
              <SectionAccordion
                key={col.status}
                col={col}
                tasks={grouped.get(col.status) ?? []}
                projectsById={projectsById}
                onSelect={onSelect}
                collapsed={collapsed.has(col.status)}
                onToggle={() => toggleCollapsed(col.status)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showAbandoned && (
        <div className="mt-2">
          <AbandonedRow
            tasks={grouped.get('abandoned') ?? []}
            onSelect={onSelect}
            projectsById={projectsById}
          />
        </div>
      )}
    </div>
  );
}

function SectionAccordion({
  col,
  tasks,
  projectsById,
  onSelect,
  collapsed,
  onToggle,
}: {
  col: ColumnDef;
  tasks: Task[];
  projectsById: Map<string, ProjectTagInfo>;
  onSelect: (task: Task) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: col.status });

  const projectCount = distinctProjectCount(tasks);

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ['--col-hue' as string]: `var(${col.hueVar})`,
      }}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card/60 backdrop-blur-sm',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent, hsl(var(--col-hue) / 0.7), transparent)',
        }}
      />
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${col.label} section`}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:bg-accent/50 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-2 rounded py-1 pr-1 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              collapsed && '-rotate-90',
            )}
          />
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background: 'hsl(var(--col-hue))',
              boxShadow: '0 0 8px -1px hsl(var(--col-hue) / 0.7)',
            }}
          />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {col.label}
          </h2>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {tasks.length}
          </span>
          {collapsed && (
            <span className="ml-1 text-[11px] text-muted-foreground/70">
              {tasks.length === 0
                ? 'Empty'
                : `${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${projectCount} project${
                    projectCount === 1 ? '' : 's'
                  }`}
            </span>
          )}
        </button>
      </div>

      {!collapsed &&
        (tasks.length === 0 ? (
          <div className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground/70">
            Nothing here
          </div>
        ) : (
          <div className="border-t border-border/60">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={t.projectId ? projectsById.get(t.projectId) : undefined}
                onSelect={() => onSelect(t)}
              />
            ))}
          </div>
        ))}
    </section>
  );
}

function TaskRow({
  task,
  project,
  onSelect,
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect: () => void;
}) {
  const kind = task.kind ?? 'unknown';
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ ['--kind-hue' as string]: `var(${KIND_HUE_VARS[kind]})` }}
      className="flex w-full items-center gap-3 border-b border-border/40 px-3 py-2 text-left last:border-b-0 hover:bg-accent/40"
    >
      <span
        className="inline-flex w-20 shrink-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
        style={{ background: 'hsl(var(--kind-hue) / 0.12)', color: 'hsl(var(--kind-hue))' }}
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: 'hsl(var(--kind-hue))' }} />
        {KIND_LABELS[kind]}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
      {task.repo && (
        <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:inline">{task.repo}</span>
      )}
      {project && <ProjectTag tag={project.tag} color={project.color} className="shrink-0" />}
    </button>
  );
}
