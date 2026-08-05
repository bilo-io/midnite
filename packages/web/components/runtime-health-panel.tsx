'use client';

import { useTranslations } from 'next-intl';
import type { PreflightCheck, PreflightStatus } from '@midnite/shared';
import { getPreflight, getReadiness } from '@/lib/api';
import { useOpsCardTitle } from '@/lib/ops-widget-labels';
import { usePolling } from '@/lib/use-polling';
import { useUnitFormat } from '@/lib/use-unit-format';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';

const POLL_MS = 10_000;

/** Dot colour per preflight status; the words live in `ops.runtimeHealth.status.*`. */
const STATUS_DOT: Record<PreflightStatus, string> = {
  ok: 'bg-[hsl(var(--success))]',
  warn: 'bg-amber-500',
  fail: 'bg-destructive',
};

/**
 * Uptime as a two-part coarse figure (`3d 4h`, `12h 30m`, `45m`). Composed from
 * `useUnitFormat().age` so both halves carry the locale's unit spelling — the pair
 * shape (two units, largest first) is this panel's own, hence the local helper.
 */
function useUptimeLabel(): (ms: number) => string {
  const { age } = useUnitFormat();
  return (ms) => {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${age(d, 'days')} ${age(h, 'hours')}`;
    if (h > 0) return `${age(h, 'hours')} ${age(m, 'minutes')}`;
    return age(m, 'minutes');
  };
}

function CheckRow({ check }: { check: PreflightCheck }) {
  const t = useTranslations('ops');
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATUS_DOT[check.status])}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{check.name}</span>
          <span className="text-xs text-muted-foreground">
            {t(`runtimeHealth.status.${check.status}`)}
          </span>
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
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');
  const cardTitle = useOpsCardTitle();
  const uptime = useUptimeLabel();
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
    <div className="rounded-xl border surface-glass p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{cardTitle('runtime-health')}</h2>
        {readiness ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              readiness.ready
                ? 'bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]'
                : 'bg-destructive/15 text-destructive',
            )}
          >
            {readiness.ready ? t('runtimeHealth.ready') : t('runtimeHealth.notReady')}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <WidgetLoader />
        </div>
      ) : unreachable ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t('runtimeHealth.unreachable')}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('runtimeHealth.uptime')}</span>
              <span className="text-sm font-medium tabular-nums">
                {readiness ? uptime(readiness.uptimeMs) : tCommon('units.emDash')}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t('runtimeHealth.spawner')}</span>
              <span className="text-sm font-medium">
                {/* `detail` is gateway-composed prose — English until the health
                    endpoint takes a locale. Documented gap. */}
                {spawner?.detail ?? tCommon('units.emDash')}
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
              {t('runtimeHealth.noPreflight')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
