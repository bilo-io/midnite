'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Project, Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { TaskCard } from '@/components/task-card';
import { TaskThreadModal } from '@/components/task-thread-modal';

const COLUMNS: Array<{ status: Status; label: string; hueVar: string }> = [
  { status: 'backlog', label: 'Backlog', hueVar: '--status-backlog' },
  { status: 'todo', label: 'Todo', hueVar: '--status-todo' },
  { status: 'wip', label: 'In progress', hueVar: '--status-wip' },
  { status: 'waiting', label: 'Waiting', hueVar: '--status-waiting' },
  { status: 'done', label: 'Done', hueVar: '--status-done' },
];

const BOARD_FILTERS: FilterOption[] = COLUMNS.map((c) => ({
  value: c.status,
  label: c.label,
  hue: `var(${c.hueVar})`,
}));

const COLUMN_STATUSES = new Set<string>(COLUMNS.map((c) => c.status));

export function BoardView({
  tasks,
  error,
  projects,
}: {
  tasks: Task[];
  error: string | null;
  projects: Project[];
}) {
  const [selected, setSelected] = useState<Task | null>(null);
  const projectsById = new Map(
    projects.map((p) => [p.id, { tag: p.tag, color: p.color }] as const),
  );

  const searchParams = useSearchParams();
  const raw = searchParams.get('status');
  const activeStatuses = (raw ? raw.split(',') : []).filter((s) => COLUMN_STATUSES.has(s));
  const showAll = activeStatuses.length === 0;
  const activeSet = new Set(activeStatuses);
  const visibleColumns = showAll ? COLUMNS : COLUMNS.filter((c) => activeSet.has(c.status));

  const grouped = new Map<Status, Task[]>();
  for (const t of tasks) {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  }

  return (
    <div className="container flex min-h-0 flex-1 flex-col gap-4 pb-4 pt-2">
      <FilterPills options={BOARD_FILTERS} />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the gateway: {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-1">
        {visibleColumns.map((col) => {
          const items = grouped.get(col.status) ?? [];
          return (
            <section
              key={col.status}
              className="relative flex h-full min-w-[240px] flex-1 flex-col overflow-hidden rounded-lg border bg-card/60 p-3 backdrop-blur-sm"
              style={{ ['--col-hue' as string]: `var(${col.hueVar})` }}
            >
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, transparent, hsl(var(--col-hue) / 0.7), transparent)',
                }}
              />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: 'hsl(var(--col-hue))',
                      boxShadow: '0 0 8px -1px hsl(var(--col-hue) / 0.7)',
                    }}
                  />
                  {col.label}
                </h2>
                <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-xs text-muted-foreground/70">
                  Nothing here
                </div>
              ) : (
                <div className="-mr-1 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      project={t.projectId ? projectsById.get(t.projectId) : undefined}
                      onSelect={() => setSelected(t)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {showAll && (
        <AbandonedRow
          tasks={grouped.get('abandoned') ?? []}
          onSelect={setSelected}
          projectsById={projectsById}
        />
      )}

      {selected ? (
        <TaskThreadModal task={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}
