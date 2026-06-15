import type { WorkflowSummary } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { listWorkflows } from '@/lib/api';
import { WorkflowsView } from './workflows-view';

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  let workflows: WorkflowSummary[] = [];
  let error: string | null = null;
  try {
    workflows = await listWorkflows();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load workflows';
  }

  return (
    <>
      <PageHeader
        title="Workflows"
        icon="Workflow"
        description="Build automations that run on a schedule, a webhook, or on demand."
        actions={<SearchBar placeholder="Search workflows" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <WorkflowsView initial={workflows} />
      </div>
    </>
  );
}
