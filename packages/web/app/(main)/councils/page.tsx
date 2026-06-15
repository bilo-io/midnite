import { CirclePile } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getCouncils } from '@/lib/api';
import { CouncilsView } from './councils-view';

export const dynamic = 'force-dynamic';

export default async function CouncilsPage() {
  let councils: Council[] = [];
  let error: string | null = null;
  try {
    councils = await getCouncils();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load councils';
  }

  return (
    <>
      <PageHeader
        title="Councils"
        icon={CirclePile}
        description="Panels of AI participants that debate a topic from fixed perspectives — then an anonymized verdict weighs the options."
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
