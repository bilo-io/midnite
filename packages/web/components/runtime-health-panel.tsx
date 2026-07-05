'use client';

import type { PreflightCheck, PreflightStatus } from '@midnite/shared';
import { getPreflight, getReadiness } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';

const POLL_MS = 10_000;

const STATUS_META: Record<PreflightStatus, { dot: string; label: string }> = {
  ok: { dot: 'bg-[hsl(var(--success))]', label: 'OK' },
  warn: { dot: 'bg-amber-500', label: 'Warn' },
  fail: { dot: 'bg-destructive', label: 'Fail' },
};

function fmtUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function CheckRow({ check }: { check: PreflightCheck }) {
  const meta = STATUS_META[check.status];
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', meta.dot)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{check.name}</span>
          <span className="text-xs text-muted-foreground">{meta.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{check.detail}</p>
        {check.status !== 'ok' && check.remedy ? (
          <p className="mt-0.5 text-xs italic text-muted-foreground">→ {check.remedy}</p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Runtime health (Phase 54 F): live readiness + boot-preflight for the gateway,
 * on the Ops page. Reads `GET /health/ready` + `GET /health/preflight` (both
 * re-run live; a degraded gateway returns 503 with the report, which the API
 * client parses rather than throwing). The last-shutdown-clean flag lands with
 * Theme E.
 */
export function RuntimeHealthPanel() {
  const { data: readiness, error: readyErr, loading: readyLoading } = usePolling(
    () => getReadiness(),
    POLL_MS,
  );
  const { data: preflight, error: preErr, loading: preLoading } = usePolling(
    () => getPreflight(),
    POLL_MS,
  );

  const loading = (readyLoading || preLoading) && !readiness && !preflight;
  const unreachable = readyErr && preErr && !readiness && !preflight;
  const spawner = readiness?.checks.find((c) => c.name === 'spawner');

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Runtime health</h2>
        {readiness ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              readiness.ready
                ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {readiness.ready ? 'Ready' : 'Not ready'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <WidgetLoader />
        </div>
      ) : unreachable ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Gateway unreachable — can&apos;t read health.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Uptime</span>
              <span className="text-sm font-medium tabular-nums">
                {readiness ? fmtUptime(readiness.uptimeMs) : '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Spawner</span>
              <span className="text-sm font-medium">
                {spawner?.status === 'ok' ? spawner.detail : (spawner?.detail ?? '—')}
              </span>
            </div>
          </div>

          {preflight ? (
            <ul className="divide-y divide-border/60">
              {preflight.checks.map((c) => (
                <CheckRow key={c.name} check={c} />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Preflight report unavailable.
            </p>
          )}
        </>
      )}
    </div>
  );
}
