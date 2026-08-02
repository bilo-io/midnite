'use client';

import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { listWorkflows } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { WorkflowsView } from './workflows-view';

export default function WorkflowsPage() {
  const t = useTranslations('workflows');
  const { data, error } = useApiData(() => listWorkflows());
  const workflows = data ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title={t('list.title')}
        icon="Workflow"
        description={t('list.description')}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <WorkflowsView initial={workflows} />
      </div>
    </>
  );
}
