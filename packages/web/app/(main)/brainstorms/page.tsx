'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getBrainstorms } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { BrainstormsView } from './brainstorms-view';

export default function BrainstormsPage() {
  const { data, error } = useApiData(() => getBrainstorms());
  const brainstorms = data ?? [];

  return (
    <>
      <PageHeader
        title="Brainstorm"
        icon="Brain"
        description="Panels of AI contributors that generate ideas from distinct lenses — then a synthesizer distills them into a shortlist, gaps, opportunities, a critique, or combined concepts."
        actions={<SearchBar placeholder="Search brainstorms" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <BrainstormsView initial={brainstorms} />
      </div>
    </>
  );
}
