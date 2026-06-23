'use client';

import { getOpsMetrics, getPoolSnapshot, getUsageSummary } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { PageHeader } from '@/components/page-header';
import { OpsView } from '@/components/ops-view';

const POLL_MS = 10_000;
const SPEND_REFRESH_MS = 60_000;

function windowFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function OpsPage() {
  const { data: pool, error: poolErr, loading: poolLoading, refresh: refreshPool } = usePolling(
    () => getPoolSnapshot(),
    POLL_MS,
  );
  const { data: summary, error: summaryErr, loading: summaryLoading, refresh: refreshSummary } = usePolling(
    () => getOpsMetrics(),
    POLL_MS,
  );
  const { data: usage, error: usageErr, loading: usageLoading, refresh: refreshUsage } = usePolling(
    () => getUsageSummary({ from: windowFrom(), groupBy: 'day' }),
    SPEND_REFRESH_MS,
  );

  useGatewayErrorToast(poolErr ?? summaryErr ?? usageErr);

  const loading = poolLoading || summaryLoading || usageLoading;

  function refresh() {
    refreshPool();
    refreshSummary();
    refreshUsage();
  }

  return (
    <>
      <PageHeader
        title="Ops"
        icon="ActivitySquare"
        description="Fleet health — live slot utilization, run throughput, duration distribution, retry/abandon rates, and LLM spend."
      />
      <OpsView
        pool={pool}
        summary={summary}
        usage={usage}
        loading={loading}
        onRefresh={refresh}
      />
    </>
  );
}
