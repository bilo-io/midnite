'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GuardrailCaps } from '@midnite/shared';
import { getGuardrailCaps } from '@/lib/api';

function money(v: number | null, unset: string): string {
  return v == null ? unset : `$${v}`;
}

/** A read-only key/value row; a null/"unset" value is dimmed. */
function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? 'text-muted-foreground' : 'font-medium'}>{value}</span>
    </div>
  );
}

function Chips({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <span className="text-xs text-muted-foreground">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <span key={it} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {it}
        </span>
      ))}
    </div>
  );
}

/**
 * Phase 50 E — read-only view of the configured spend/rate caps + the
 * blast-radius protected-actions floor. These live in `midnite.json` (not
 * editable through the API), so the panel shows what's in effect and says so.
 */
export function SafetyCapsPanel() {
  const t = useTranslations('safety');
  const [caps, setCaps] = useState<GuardrailCaps | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    getGuardrailCaps()
      .then((c) => {
        if (!alive) return;
        setCaps(c);
        setState('ready');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'loading') return <p className="text-sm text-muted-foreground">{t('caps.loading')}</p>;
  if (state === 'error' || !caps) {
    return <p className="text-sm text-muted-foreground">{t('caps.loadError')}</p>;
  }

  const unset = t('caps.unset');
  const rate = caps.maxSpawnsPerHour > 0 ? t('caps.perHour', { count: caps.maxSpawnsPerHour }) : t('caps.unlimited');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('caps.spendRateHeading')}</h3>
        <div className="mt-1 divide-y divide-border/60">
          <Row label={t('caps.hardDailyCap')} value={money(caps.hardDailyCapUsd, unset)} muted={caps.hardDailyCapUsd == null} />
          <Row
            label={t('caps.hardMonthlyCap')}
            value={money(caps.hardMonthlyCapUsd, unset)}
            muted={caps.hardMonthlyCapUsd == null}
          />
          <Row
            label={t('caps.softDailyBudget')}
            value={money(caps.softDailyBudgetUsd, unset)}
            muted={caps.softDailyBudgetUsd == null}
          />
          <Row
            label={t('caps.softMonthlyBudget')}
            value={money(caps.softMonthlyBudgetUsd, unset)}
            muted={caps.softMonthlyBudgetUsd == null}
          />
          <Row label={t('caps.maxSpawnsPerHour')} value={rate} muted={caps.maxSpawnsPerHour === 0} />
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> {t('blastRadius.heading')}
        </h3>
        <div className="mt-1 space-y-2">
          <Row
            label={t('blastRadius.enabledLabel')}
            value={caps.blastRadiusEnabled ? t('blastRadius.on') : t('blastRadius.off')}
            muted={!caps.blastRadiusEnabled}
          />
          <div>
            <p className="py-1 text-sm text-muted-foreground">{t('blastRadius.protectedBranches')}</p>
            <Chips items={caps.protectedBranches} empty={t('blastRadius.none')} />
          </div>
          <div>
            <p className="py-1 text-sm text-muted-foreground">{t('blastRadius.protectedPathGlobs')}</p>
            <Chips items={caps.protectedPathGlobs} empty={t('blastRadius.none')} />
          </div>
          <Row
            label={t('blastRadius.scrubSpawnEnv')}
            value={caps.scrubSpawnEnv ? t('blastRadius.on') : t('blastRadius.off')}
            muted={!caps.scrubSpawnEnv}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t.rich('caps.footnote', { code: (chunks) => <code className="font-mono">{chunks}</code> })}
      </p>
    </div>
  );
}
