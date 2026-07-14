'use client';

import dynamic from 'next/dynamic';
import { fetchTasksDoctor, getOpsMetrics, getPoolSnapshot, getUsageSummary } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { useLiveGauges } from '@/hooks/use-metrics-events';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { PageHeader } from '@/components/page-header';
import { OpsAddWidget } from '@/components/ops-add-widget';

// react-grid-layout needs the DOM/container width, so the grid is client-only.
const OpsGrid = dynamic(() => import('@/components/ops-grid').then((m) => m.OpsGrid), {
  ssr: false,
});

const POLL_MS = 10_000;
const SPEND_REFRESH_MS = 60_000;

function windowFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function OpsPage() {
  const { data: pool, error: poolErr, loading: poolLoading } = usePolling(() => getPoolSnapshot(), POLL_MS);
  const { data: summary, error: summaryErr, loading: summaryLoading } = usePolling(
    () => getOpsMetrics(),
    POLL_MS,
  );
  const { data: usage, error: usageErr, loading: usageLoading } = usePolling(
    () => getUsageSummary({ from: windowFrom(), groupBy: 'day' }),
    SPEND_REFRESH_MS,
  );
  // Phase 53 E — task-health "what's wedged?" report.
  const { data: doctor, error: doctorErr } = usePolling(() => fetchTasksDoctor(), POLL_MS);

  // Phase 61 F — live fleet gauges over the reliable WS. When a push is present
  // it patches the polled summary's gauges (the poll stays as the fallback path).
  const liveGauges = useLiveGauges();
  const liveSummary =
    summary && liveGauges ? { ...summary, gauges: liveGauges } : summary;

  useGatewayErrorToast(poolErr ?? summaryErr ?? usageErr ?? doctorErr);

  const loading = poolLoading || summaryLoading || usageLoading;

  return (
    <>
      <PageHeader
        title="Ops"
        icon="ActivitySquare"
        description="Fleet health — live slot utilization, run throughput, duration distribution, retry/abandon rates, and LLM spend."
        actions={<OpsAddWidget />}
      />

      <OpsGrid pool={pool} summary={liveSummary} usage={usage} doctor={doctor} loading={loading} />
    </>
  );
}
