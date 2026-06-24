'use client';

import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
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
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/workflows/templates"
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Templates
            </Link>
            <SearchBar placeholder="Search workflows" />
          </div>
        }
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <WorkflowsView initial={workflows} />
      </div>
    </>
  );
}
