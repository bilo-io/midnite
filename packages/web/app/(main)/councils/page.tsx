'use client';

import { useTranslations } from 'next-intl';

import { PageHeader } from '@/components/page-header';
import { getCouncils } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { CouncilsView } from './councils-view';

export default function CouncilsPage() {
  const t = useTranslations('council');
  const { data, error } = useApiData(() => getCouncils());
  const councils = data ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title={t('title')}
        icon="CirclePile"
        description={t('description')}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <CouncilsView initial={councils} />
      </div>
    </>
  );
}
