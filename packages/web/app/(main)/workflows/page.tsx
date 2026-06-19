'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { listWorkflows } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { WorkflowsView } from './workflows-view';

export default function WorkflowsPage() {
  const { data, error } = useApiData(() => listWorkflows());
  const workflows = data ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title="Workflows"
        icon="Workflow"
        description="Build automations that run on a schedule, a webhook, or on demand."
        actions={<SearchBar placeholder="Search workflows" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <WorkflowsView initial={workflows} />
      </div>
    </>
  );
}
