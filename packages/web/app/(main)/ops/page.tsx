'use client';

import { fetchTasksDoctor, getOpsMetrics, getPoolSnapshot, getUsageSummary } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { useLiveGauges } from '@/hooks/use-metrics-events';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { PageHeader } from '@/components/page-header';
import { OpsView } from '@/components/ops-view';
import { RuntimeHealthPanel } from '@/components/runtime-health-panel';
import { TaskHealthPanel } from '@/components/task-health-panel';

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
  // Phase 53 E — task-health "what's wedged?" report.
  const { data: doctor, error: doctorErr, refresh: refreshDoctor } = usePolling(
    () => fetchTasksDoctor(),
    POLL_MS,
  );

  // Phase 61 F — live fleet gauges over the reliable WS. When a push is present
  // it patches the polled summary's gauges (the poll stays as the fallback path).
  const liveGauges = useLiveGauges();
  const liveSummary =
    summary && liveGauges ? { ...summary, gauges: liveGauges } : summary;

  useGatewayErrorToast(poolErr ?? summaryErr ?? usageErr ?? doctorErr);

  const loading = poolLoading || summaryLoading || usageLoading;

  function refresh() {
    refreshPool();
    refreshSummary();
    refreshUsage();
    refreshDoctor();
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
        summary={liveSummary}
        usage={usage}
        loading={loading}
        onRefresh={refresh}
      />
      <div className="mt-4">
        <TaskHealthPanel report={doctor} />
      </div>
      <div className="container pb-8">
        <RuntimeHealthPanel />
      </div>
    </>
  );
}
