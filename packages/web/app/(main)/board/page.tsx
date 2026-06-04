import type { Task } from '@midnite/shared';
import { BoardView } from '@/components/board-view';
import { PageHeader } from '@/components/page-header';
import { getTasks } from '@/lib/api';

// Filters live in the URL query string and are read client-side via useSearchParams,
// so the route must render dynamically (like /sessions).
export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  let tasks: Task[] = [];
  let error: string | null = null;
  try {
    tasks = await getTasks();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load tasks';
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <PageHeader
        title="Board"
        description="Tasks grouped by status. Abandoned tasks are tucked away at the bottom."
      />
      <BoardView tasks={tasks} error={error} />
    </div>
  );
}
