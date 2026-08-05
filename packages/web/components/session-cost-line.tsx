'use client';

import { useTranslations } from 'next-intl';
import { getUsageAttribution } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useLocaleFormat } from '@/lib/use-locale-format';
import { cn } from '@/lib/utils';

/**
 * Sub-cent spend still reads rather than rounding away to nothing. `narrowSymbol`
 * keeps en-GB at `$2.50` (Intl would otherwise write `US$2.50`) while fr-FR gets
 * `2,50 $` — matching the project cost card.
 */
function useUsdLabel(): (n: number) => string {
  const { number } = useLocaleFormat();
  const usd = (v: number) =>
    number(v, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol' });
  return (n) => (n > 0 && n < 0.01 ? `<${usd(0.01)}` : usd(n));
}

/**
 * Session cockpit cost line (Phase 61 H / P51): this session's harvested
 * agent-session spend, read from `GET /usage/attribution?groupBy=session` and
 * matched by id. Honest about whether the figure is measured or estimated;
 * renders nothing until data resolves, and a quiet dash when the session has no
 * cost row yet. Sits beside the existing token/context stat.
 */
export function SessionCostLine({ sessionId, className }: { sessionId: string; className?: string }) {
  const t = useTranslations('sessions');
  const fmtUsd = useUsdLabel();
  const { data, loading, error } = useApiData(async () => {
    const res = await getUsageAttribution({ groupBy: 'session' });
    return res.buckets.find((b) => b.key === sessionId) ?? null;
  }, [sessionId]);

  // Nothing to show while the first fetch is still in flight, or if it failed.
  if (error) return null;
  if (!data) {
    if (loading) return null;
    // Resolved with no bucket → quiet honest dash.
    return (
      <div className={cn('flex items-baseline justify-between gap-3', className)}>
        <dt className="shrink-0 text-muted-foreground">{t('cost.label')}</dt>
        <dd className="min-w-0 truncate text-right font-mono text-foreground/90">{t('cost.noValue')}</dd>
      </div>
    );
  }

  const measured = data.estimatedCostUsd === 0 && data.measuredCostUsd > 0;
  const kind =
    data.estCostUsd === 0 ? '' : measured ? t('cost.measured') : t('cost.measuredEstimated');

  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <dt className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {t('cost.label')}
        {data.unpricedSessions > 0 ? (
          <span
            className="rounded bg-muted px-1 text-[9px] uppercase tracking-wide"
            title={t('cost.unpricedTitle')}
          >
            {t('cost.unpriced')}
          </span>
        ) : null}
      </dt>
      <dd
        className="min-w-0 truncate text-right font-mono text-foreground/90"
        title={t('cost.breakdownTitle', {
          measured: fmtUsd(data.measuredCostUsd),
          estimated: fmtUsd(data.estimatedCostUsd),
        })}
      >
        {fmtUsd(data.estCostUsd)}
        <span className="text-muted-foreground">{kind}</span>
      </dd>
    </div>
  );
}
