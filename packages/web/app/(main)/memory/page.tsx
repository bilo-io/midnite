'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getMemories, getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { MemoryView } from './memory-view';

export default function MemoryPage() {
  const { data, error } = useApiData(() => Promise.all([getMemories(), getProjects()]));
  const memories = data?.[0] ?? [];
  const projects = data?.[1] ?? [];

  return (
    <>
      <PageHeader
        title="Memory"
        icon="BrainCircuit"
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
