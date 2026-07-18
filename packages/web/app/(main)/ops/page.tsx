'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchTasksDoctor, getOpsMetrics, getPoolSnapshot, getUsageSummary } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePolling } from '@/lib/use-polling';
import { useLiveGauges } from '@/hooks/use-metrics-events';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { PageHeader } from '@/components/page-header';
import { OpsAddWidget } from '@/components/ops-add-widget';
import { DecisionsSection } from '@/components/ops-view';
import { DigestsFeed } from '@/components/digests-feed';

// react-grid-layout needs the DOM/container width, so the grid is client-only.
const OpsGrid = dynamic(() => import('@/components/ops-grid').then((m) => m.OpsGrid), {
  ssr: false,
});

const POLL_MS = 10_000;
const SPEND_REFRESH_MS = 60_000;

const TABS = [
  { value: 'metrics', label: 'Metrics' },
  { value: 'decisions', label: 'Decisions' },
  { value: 'digest', label: 'Digest' },
] as const;
type OpsTab = (typeof TABS)[number]['value'];

function windowFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// The active tab lives in `?tab=` so a reload (and links) restore it; under
// `output: 'export'` useSearchParams needs a Suspense boundary (like
// /tasks/view and /projects/view).
export default function OpsPage() {
  return (
    <Suspense fallback={null}>
      <OpsPageInner />
    </Suspense>
  );
}

function OpsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab');
  const tab: OpsTab = tabParam === 'decisions' || tabParam === 'digest' ? tabParam : 'metrics';
  const setTab = (next: OpsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'metrics') params.delete('tab');
    else params.set('tab', next);
    // `?id=` is the digest selection — meaningless off the Digest tab.
    if (next !== 'digest') params.delete('id');
    const qs = params.toString();
    router.replace(qs ? `/ops?${qs}` : '/ops', { scroll: false });
  };

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
      />

      <div className="container flex items-center justify-between gap-2 pt-2">
        <div role="tablist" aria-label="Ops sections" className="flex w-fit gap-1 rounded-lg border p-1 text-sm">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                tab === value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'metrics' ? <OpsAddWidget /> : null}
      </div>

      {tab === 'metrics' && (
        <OpsGrid pool={pool} summary={liveSummary} usage={usage} doctor={doctor} loading={loading} />
      )}
      {tab === 'decisions' && (
        <div className="container space-y-6 pb-8 pt-4">
          <DecisionsSection />
        </div>
      )}
      {tab === 'digest' && <DigestsFeed />}
    </>
  );
}
