'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, ExternalLink, Newspaper } from 'lucide-react';
import type { Digest, DigestSummary } from '@midnite/shared';

import { EmptyState } from '@/components/empty-state';
import { ExportMenu } from '@/components/export-menu';
import { MarkdownPreview } from '@/components/markdown-preview';
import { WidgetLoader } from '@/components/spinner';
import { exportDigest, getDigest } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { cn } from '@/lib/utils';

type Props = {
  digests: DigestSummary[];
  loading: boolean;
};

function fmtWindow(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return `${from} → ${to}`;
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${f.toLocaleDateString(undefined, opts)} → ${t.toLocaleDateString(undefined, opts)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** A tally pill — shipped (green) / failed (red) / needs-attention (amber). */
function Tally({ label, value, tone }: { label: string; value: number; tone: 'ship' | 'fail' | 'attn' }) {
  const toneCls =
    tone === 'ship'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'fail'
        ? 'text-red-600 dark:text-red-400'
        : 'text-amber-600 dark:text-amber-400';
  return (
    <span className="inline-flex items-baseline gap-1" title={label}>
      <span className={cn('text-sm font-semibold tabular-nums', toneCls)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </span>
  );
}

/** The expanded detail for one digest — fetched on demand. */
function DigestDetail({ id }: { id: string }) {
  const { data: digest, error, loading } = useApiData<Digest>(() => getDigest(id), [id]);

  if (loading && !digest) return <WidgetLoader />;
  if (error || !digest) {
    return <p className="px-4 py-3 text-sm text-destructive">Couldn’t load this digest — {error ?? 'not found'}.</p>;
  }

  return (
    <div className="space-y-4 border-t bg-muted/20 px-4 py-4">
      {/* Best-effort spend + cycle-time (each null when its source was unreachable). */}
      {(digest.spend || digest.cycle) && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {digest.spend && (
            <span>
              Spend <span className="font-semibold text-foreground">${digest.spend.totalUsd.toFixed(2)}</span> ·{' '}
              {digest.spend.sessions} sessions
            </span>
          )}
          {digest.cycle && digest.cycle.p50Ms != null && (
            <span>
              Cycle p50 <span className="font-semibold text-foreground">{Math.round(digest.cycle.p50Ms / 60000)}m</span>
            </span>
          )}
        </div>
      )}

      {digest.sections.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">By repo</h4>
          <ul className="space-y-1">
            {digest.sections.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span className="truncate font-medium text-foreground">{s.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {s.shipped} shipped · {s.failed} failed
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {digest.highlights.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Highlights</h4>
          <ul className="space-y-1.5">
            {digest.highlights.map((h) => (
              <li key={h.taskId} className="text-sm">
                <Link
                  href={`/tasks/view?id=${encodeURIComponent(h.taskId)}`}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                >
                  {h.title}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden />
                </Link>
                <span
                  className={cn(
                    'ml-2 text-xs',
                    h.outcome === 'abandoned' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                  )}
                >
                  {h.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border bg-card p-3">
        <MarkdownPreview content={digest.markdown} />
      </div>

      <div className="flex justify-end">
        <ExportMenu
          fetchMarkdown={() => exportDigest(id)}
          filename={`digest-${id.slice(0, 8)}`}
          title={digest.headline}
        />
      </div>
    </div>
  );
}

export function DigestsView({ digests, loading }: Props) {
  const initialId = useSearchParams().get('id');
  const [openId, setOpenId] = useState<string | null>(initialId);

  if (loading) return <WidgetLoader />;

  if (digests.length === 0) {
    return (
      <EmptyState
        Icon={Newspaper}
        title="No digests yet"
        description="Fleet digests are produced by the digest workflow (enable the “Daily Task Digest” template). Once one runs, it shows up here."
      />
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {digests.map((d) => {
        const open = openId === d.id;
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : d.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-foreground">{d.headline}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtDate(d.createdAt)} · {fmtWindow(d.from, d.to)}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Tally label="shipped" value={d.counts.shipped} tone="ship" />
                <Tally label="failed" value={d.counts.failed} tone="fail" />
                {d.counts.needsAttention > 0 && (
                  <Tally label="attention" value={d.counts.needsAttention} tone="attn" />
                )}
              </div>
            </button>
            {open && <DigestDetail id={d.id} />}
          </li>
        );
      })}
    </ul>
  );
}
