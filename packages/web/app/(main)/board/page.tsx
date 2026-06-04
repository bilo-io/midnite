import type { Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { PageHeader } from '@/components/page-header';
import { TaskCard } from '@/components/task-card';
import { getTasks } from '@/lib/api';

const COLUMNS: Array<{ status: Status; label: string; hueVar: string }> = [
  { status: 'backlog', label: 'Backlog', hueVar: '--status-backlog' },
  { status: 'todo', label: 'Todo', hueVar: '--status-todo' },
  { status: 'wip', label: 'In progress', hueVar: '--status-wip' },
  { status: 'waiting', label: 'Waiting', hueVar: '--status-waiting' },
  { status: 'done', label: 'Done', hueVar: '--status-done' },
];

export default async function BoardPage() {
  let tasks: Task[] = [];
  let error: string | null = null;
  try {
    tasks = await getTasks();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load tasks';
  }

  const grouped = new Map<Status, Task[]>();
  for (const t of tasks) {
    const list = grouped.get(t.status) ?? [];
    list.push(t);
    grouped.set(t.status, list);
  }

  return (
    <>
      <PageHeader
        title="Board"
        description="Tasks grouped by status. Abandoned tasks are tucked away at the bottom."
      />
      <div className="container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = grouped.get(col.status) ?? [];
            return (
              <section
                key={col.status}
                className="relative flex min-h-[200px] flex-col gap-2 overflow-hidden rounded-lg border bg-card/60 p-3 backdrop-blur-sm"
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
                <div className="flex items-center justify-between">
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
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 py-6 text-xs text-muted-foreground/70">
                    Nothing here
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((t) => (
                      <TaskCard key={t.id} task={t} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <AbandonedRow tasks={grouped.get('abandoned') ?? []} />
      </div>
    </>
  );
}
