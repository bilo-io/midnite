'use client';

import { Coins } from 'lucide-react';
import { getCycleTime, getUsageAttribution } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

/** Sub-cent spend still reads rather than rounding away to nothing. */
function fmtUsd(n: number): string {
  return n > 0 && n < 0.01 ? '<$0.01' : `$${n.toFixed(2)}`;
}

/** Human duration from ms (`—` when null): s / m / h / d. */
function fmtDuration(ms: number | null): string {
  if (ms === null) return '—';
  const s = ms / 1_000;
  if (s < 60) return `${Math.round(s)}s`;
  const m = s / 60;
  if (m < 60) return `${m < 10 ? m.toFixed(1) : Math.round(m)}m`;
  const h = m / 60;
  if (h < 24) return `${h < 10 ? h.toFixed(1) : Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

/**
 * Project cockpit cost/throughput card (Phase 61 H / P55): the project's harvested
 * agent-session spend (measured vs. estimated split) + session count, plus a p50
 * end-to-end cycle-time stat. Reads the cross-project attribution + cycle-time
 * endpoints and picks this project's bucket. Honest empty state when it has none.
 */
export function ProjectCostCard({ projectId }: { projectId: string }) {
  const { data } = useApiData(async () => {
    const [attribution, cycle] = await Promise.all([
      getUsageAttribution({ groupBy: 'project' }),
      getCycleTime({ groupBy: 'project', windowDays: 30 }).catch(() => null),
    ]);
    const bucket = attribution.buckets.find((b) => b.key === projectId) ?? null;
    const group = cycle?.groups.find((g) => g.key === projectId) ?? null;
    return { bucket, p50EndToEndMs: group?.endToEnd.p50Ms ?? null };
  }, [projectId]);

  const bucket = data?.bucket ?? null;

  return (
    <div className="space-y-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Coins className="h-3.5 w-3.5" /> Cost & throughput
      </span>
      {!bucket ? (
        <p className="text-[11px] text-muted-foreground">No agent-session cost recorded yet.</p>
      ) : (
        <dl className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Spend</dt>
            <dd className="font-semibold tabular-nums text-foreground">{fmtUsd(bucket.estCostUsd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Measured · estimated</dt>
            <dd className="tabular-nums text-foreground/90">
              {fmtUsd(bucket.measuredCostUsd)} · {fmtUsd(bucket.estimatedCostUsd)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">Sessions</dt>
            <dd className="tabular-nums text-foreground/90">{bucket.sessions}</dd>
          </div>
          {data?.p50EndToEndMs != null ? (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">p50 end-to-end</dt>
              <dd className="tabular-nums text-foreground/90">{fmtDuration(data.p50EndToEndMs)}</dd>
            </div>
          ) : null}
          {bucket.unpricedSessions > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {bucket.unpricedSessions} on an unpriced model — cost not counted.
            </p>
          ) : null}
        </dl>
      )}
    </div>
  );
}
