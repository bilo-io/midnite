'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getCouncils } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { CouncilsView } from './councils-view';

export default function CouncilsPage() {
  const { data, error } = useApiData(() => getCouncils());
  const councils = data ?? [];

  return (
    <>
      <PageHeader
        title="Councils"
        icon="CirclePile"
        description="Panels of AI members that respond to a prompt from fixed roles — then a synthesizer distils them in any format: brainstorm, debate, analyse, and more."
        actions={<SearchBar placeholder="Search councils" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <CouncilsView initial={councils} />
      </div>
    </>
  );
}
