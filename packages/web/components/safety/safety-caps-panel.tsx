'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { GuardrailCaps } from '@midnite/shared';
import { getGuardrailCaps } from '@/lib/api';

function money(v: number | null): string {
  return v == null ? 'unset' : `$${v}`;
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

  if (state === 'loading') return <p className="text-sm text-muted-foreground">Loading caps…</p>;
  if (state === 'error' || !caps) {
    return <p className="text-sm text-muted-foreground">Couldn’t load the configured caps.</p>;
  }

  const rate = caps.maxSpawnsPerHour > 0 ? `${caps.maxSpawnsPerHour}/hour` : 'unlimited';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Spend &amp; rate caps</h3>
        <div className="mt-1 divide-y divide-border/60">
          <Row label="Hard daily cap (blocks spawns)" value={money(caps.hardDailyCapUsd)} muted={caps.hardDailyCapUsd == null} />
          <Row label="Hard monthly cap (blocks spawns)" value={money(caps.hardMonthlyCapUsd)} muted={caps.hardMonthlyCapUsd == null} />
          <Row label="Soft daily budget (warn only)" value={money(caps.softDailyBudgetUsd)} muted={caps.softDailyBudgetUsd == null} />
          <Row label="Soft monthly budget (warn only)" value={money(caps.softMonthlyBudgetUsd)} muted={caps.softMonthlyBudgetUsd == null} />
          <Row label="Max spawns / hour" value={rate} muted={caps.maxSpawnsPerHour === 0} />
        </div>
      </div>

      <div>
        <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5" /> Blast-radius (destructive-action floor)
        </h3>
        <div className="mt-1 space-y-2">
          <Row
            label="Enabled (guarded / autonomous)"
            value={caps.blastRadiusEnabled ? 'on' : 'off'}
            muted={!caps.blastRadiusEnabled}
          />
          <div>
            <p className="py-1 text-sm text-muted-foreground">Protected branches</p>
            <Chips items={caps.protectedBranches} empty="none" />
          </div>
          <div>
            <p className="py-1 text-sm text-muted-foreground">Protected path globs</p>
            <Chips items={caps.protectedPathGlobs} empty="none" />
          </div>
          <Row label="Scrub gateway secrets from agent env" value={caps.scrubSpawnEnv ? 'on' : 'off'} muted={!caps.scrubSpawnEnv} />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Caps &amp; protected actions are configured in <code className="font-mono">midnite.json</code> and shown here read-only.
      </p>
    </div>
  );
}
