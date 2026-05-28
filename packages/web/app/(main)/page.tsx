import { DashboardTiles } from '@/components/dashboard-tiles';
import { PromptComposer } from '@/components/prompt-composer';
import { getTaskCounts } from '@/lib/api';

export default async function DashboardPage() {
  let counts;
  let error: string | null = null;
  try {
    counts = await getTaskCounts();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load task counts';
    counts = { backlog: 0, inProgress: 0, done: 0 };
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          An overview of your task backlog. Drop a prompt below to create a new task.
        </p>
      </section>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Could not reach the gateway: {error}
        </div>
      )}

      <DashboardTiles counts={counts} />

      <section className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          New task
        </h2>
        <PromptComposer />
      </section>
    </div>
  );
}
