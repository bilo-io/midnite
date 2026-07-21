'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Digest } from '@midnite/shared';

import { cn } from '@/lib/utils';
import { exportDigest } from '@/lib/api';
import { ExportMenu } from '@/components/export-menu';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** `2h 5m` / `3m` / `8s` / `—` from milliseconds. */
function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  if (totalMin < 60) return `${totalMin}m`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hr < 24) return `${hr}h ${min}m`;
  return `${Math.floor(hr / 24)}d ${hr % 24}h`;
}

const usd = (n: number): string => `$${n.toFixed(2)}`;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  return (
    <div className="rounded-lg border surface-glass px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
          tone === 'warn' && 'text-amber-600 dark:text-amber-400',
          !tone && 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: Digest['highlights'][number]['outcome'] }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
        outcome === 'done'
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      )}
    >
      {outcome === 'done' ? 'Shipped' : 'Abandoned'}
    </span>
  );
}

/**
 * Phase 62 G — the structured render of one fleet digest. Deliberately renders
 * the structured fields (counts / spend / cycle / sections / highlights) rather
 * than the stored markdown, so highlights deep-link into the tasks they call out.
 * The pre-rendered markdown backs the ExportMenu only.
 */
export function DigestDetail({ digest }: { digest: Digest }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{digest.headline}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {fmtDate(digest.from)} – {fmtDate(digest.to)}
          </p>
        </div>
        <ExportMenu fetchMarkdown={() => exportDigest(digest.id)} filename={`digest-${digest.id}`} iconOnly />
      </div>

      {/* Outcome tallies */}
      <section>
        <SectionTitle>Outcomes</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Shipped" value={String(digest.counts.shipped)} tone="good" />
          <StatChip label="Failed" value={String(digest.counts.failed)} tone="bad" />
          <StatChip label="Needs attention" value={String(digest.counts.needsAttention)} tone="warn" />
        </div>
      </section>

      {/* Spend (best-effort) */}
      {digest.spend && (
        <section>
          <SectionTitle>Spend</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Total" value={usd(digest.spend.totalUsd)} />
            <StatChip label="Measured" value={usd(digest.spend.measuredUsd)} />
            <StatChip label="Sessions" value={String(digest.spend.sessions)} />
          </div>
        </section>
      )}

      {/* Cycle time (best-effort) */}
      {digest.cycle && (
        <section>
          <SectionTitle>Cycle time</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Tasks" value={String(digest.cycle.tasks)} />
            <StatChip label="p50" value={formatMs(digest.cycle.p50Ms)} />
            <StatChip label="p90" value={formatMs(digest.cycle.p90Ms)} />
          </div>
        </section>
      )}

      {/* Per-repo/project sections */}
      {digest.sections.length > 0 && (
        <section>
          <SectionTitle>By repo / project</SectionTitle>
          <ul className="divide-y rounded-lg border surface-glass">
            {digest.sections.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="truncate font-medium text-foreground">{s.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400">{s.shipped} shipped</span>
                  {' · '}
                  <span className="text-rose-600 dark:text-rose-400">{s.failed} failed</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Highlights — deep-link into the called-out task */}
      {digest.highlights.length > 0 && (
        <section>
          <SectionTitle>Highlights</SectionTitle>
          <ul className="space-y-1.5">
            {digest.highlights.map((h) => (
              <li key={h.taskId}>
                <Link
                  href={`/tasks?task=${encodeURIComponent(h.taskId)}`}
                  className="group flex items-center gap-3 rounded-lg border surface-glass-interactive px-3 py-2 text-sm transition-colors hover:border-primary/50"
                >
                  <OutcomeBadge outcome={h.outcome} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{h.title}</span>
                    <span className="block truncate text-muted-foreground">{h.note}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
