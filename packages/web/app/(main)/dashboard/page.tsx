import { DashboardTiles } from '@/components/dashboard-tiles';
import { PageHeader } from '@/components/page-header';
import { PromptComposer } from '@/components/prompt-composer';
import { getTaskCounts } from '@/lib/api';

export default async function DashboardPage() {
  let counts;
  let error: string | null = null;
  try {
    counts = await getTaskCounts();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load task counts';
    counts = { backlog: 0, todo: 0, inProgress: 0, done: 0 };
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        size="lg"
        showGrid
        description="An overview of your task backlog. Drop one or more prompts below — one task per line."
      />
      <div className="container space-y-10 pb-48 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <DashboardTiles counts={counts} />
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="bg-background/0 pb-6 pt-2">
          <div className="container">
            <div className="pointer-events-auto mx-auto w-full max-w-3xl">
              <PromptComposer />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
