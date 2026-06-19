'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getMemories, getProjects } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { MemoryView } from './memory-view';

export default function MemoryPage() {
  const { data, error } = useApiData(() => Promise.all([getMemories(), getProjects()]));
  const memories = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title="Memory"
        icon="BrainCircuit"
        description="Knowledge your agents carry into every session — global or scoped to a project."
        actions={<SearchBar placeholder="Search memories" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <MemoryView initial={memories} projects={projects} />
      </div>
    </>
  );
}
