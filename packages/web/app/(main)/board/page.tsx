import type { Status, Task } from '@midnite/shared';
import { AbandonedRow } from '@/components/abandoned-row';
import { TaskCard } from '@/components/task-card';
import { getTasks } from '@/lib/api';

const COLUMNS: Array<{ status: Status; label: string }> = [
  { status: 'backlog', label: 'Backlog' },
  { status: 'todo', label: 'Todo' },
  { status: 'wip', label: 'In progress' },
  { status: 'waiting', label: 'Waiting' },
  { status: 'done', label: 'Done' },
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
    <div className="space-y-6">
      <section>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Board</h1>
        <p className="text-sm text-muted-foreground">
          Tasks grouped by status. Abandoned tasks are tucked away at the bottom.
        </p>
      </section>

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
              className="flex min-h-[200px] flex-col gap-2 rounded-lg border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <AbandonedRow tasks={grouped.get('abandoned') ?? []} />
    </div>
  );
}
