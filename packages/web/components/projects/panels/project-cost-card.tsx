'use client';

import { useTranslations } from 'next-intl';
import { Coins } from 'lucide-react';
import { getCycleTime, getUsageAttribution } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useLocaleFormat } from '@/lib/use-locale-format';

/**
 * Sub-cent spend still reads rather than rounding away to nothing. Amounts go
 * through the locale formatter (`$12.34` → `12,34 $US`); only the currency is
 * fixed, since the gateway harvests USD.
 */
function useUsdLabel(): (n: number) => string {
  const t = useTranslations('projects');
  const { number } = useLocaleFormat();
  // `narrowSymbol` keeps en-GB reading `$2.50` rather than `US$2.50` (its default for a
  // foreign currency) — same glyph as before i18n, but the grouping/decimal separators
  // and symbol placement now follow the active locale (`2,50 $` under fr-FR).
  const usd = (n: number) => number(n, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
  return (n) => (n > 0 && n < 0.01 ? t('cost.subCent', { value: usd(0.01) }) : usd(n));
}

/** Human duration from ms (the em dash when null): s / m / h / d, unit suffixes translated. */
function useDurationLabel(): (ms: number | null) => string {
  const t = useTranslations('projects');
  const { number } = useLocaleFormat();
  /** One fraction digit below 10, whole numbers above — the pre-i18n shape. */
  const coarse = (v: number) =>
    v < 10 ? number(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : number(Math.round(v));
  return (ms) => {
    if (ms === null) return t('cost.noValue');
    const s = ms / 1_000;
    if (s < 60) return t('cost.duration.seconds', { value: number(Math.round(s)) });
    const m = s / 60;
    if (m < 60) return t('cost.duration.minutes', { value: coarse(m) });
    const h = m / 60;
    if (h < 24) return t('cost.duration.hours', { value: coarse(h) });
    return t('cost.duration.days', { value: number(h / 24, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) });
  };
}

/**
 * Project cockpit cost/throughput card (Phase 61 H / P55): the project's harvested
 * agent-session spend (measured vs. estimated split) + session count, plus a p50
 * end-to-end cycle-time stat. Reads the cross-project attribution + cycle-time
 * endpoints and picks this project's bucket. Honest empty state when it has none.
 */
export function ProjectCostCard({ projectId }: { projectId: string }) {
  const t = useTranslations('projects');
  const fmtUsd = useUsdLabel();
  const fmtDuration = useDurationLabel();
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
        <Coins className="h-3.5 w-3.5" /> {t('cost.title')}
      </span>
      {!bucket ? (
        <p className="text-[11px] text-muted-foreground">{t('cost.empty')}</p>
      ) : (
        <dl className="space-y-1.5 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">{t('cost.spend')}</dt>
            <dd className="font-semibold tabular-nums text-foreground">{fmtUsd(bucket.estCostUsd)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">{t('cost.measuredEstimated')}</dt>
            <dd className="tabular-nums text-foreground/90">
              {t('cost.measuredEstimatedValue', {
                measured: fmtUsd(bucket.measuredCostUsd),
                estimated: fmtUsd(bucket.estimatedCostUsd),
              })}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted-foreground">{t('cost.sessions')}</dt>
            <dd className="tabular-nums text-foreground/90">{bucket.sessions}</dd>
          </div>
          {data?.p50EndToEndMs != null ? (
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">{t('cost.p50EndToEnd')}</dt>
              <dd className="tabular-nums text-foreground/90">{fmtDuration(data.p50EndToEndMs)}</dd>
            </div>
          ) : null}
          {bucket.unpricedSessions > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {t('cost.unpriced', { count: bucket.unpricedSessions })}
            </p>
          ) : null}
        </dl>
      )}
    </div>
  );
}
