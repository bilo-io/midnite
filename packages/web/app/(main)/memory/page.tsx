import type { Memory, Project } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getMemories, getProjects } from '@/lib/api';
import { MemoryView } from './memory-view';

export const dynamic = 'force-dynamic';

export default async function MemoryPage() {
  let memories: Memory[] = [];
  let projects: Project[] = [];
  let error: string | null = null;
  try {
    [memories, projects] = await Promise.all([getMemories(), getProjects()]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load memories';
  }

  return (
    <>
      <PageHeader
        title="Memory"
        description="Knowledge your agents carry into every session — global or scoped to a project."
        actions={<SearchBar placeholder="Search memories" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <MemoryView initial={memories} projects={projects} />
      </div>
    </>
  );
}
