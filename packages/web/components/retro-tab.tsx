'use client';

import { ExternalLink, Sparkles } from 'lucide-react';
import type { Task, TaskRetro } from '@midnite/shared';

import { cn } from '@/lib/utils';
import { exportTaskRetro, getTaskRetro } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { WidgetLoader } from '@/components/spinner';
import { ExportMenu } from '@/components/export-menu';

/** Human-readable elapsed time from milliseconds (e.g. `2h 5m`, `3m 12s`, `8s`, `—`). */
function formatMs(ms: number | null): string {
  if (ms === null) return '—';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) return `${totalMin}m ${sec}s`;
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hr < 24) return `${hr}h ${min}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: TaskRetro['outcome'] }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        outcome === 'done'
          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      )}
    >
      {outcome === 'done' ? 'Shipped' : 'Abandoned'}
    </span>
  );
}

export function RetroBody({ task, retro }: { task: Task; retro: TaskRetro }) {
  const exportFilename = `retro-${(task.title.trim() || 'task')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'task'}.md`;

  return (
    <div className="space-y-6">
      {/* Header: outcome + honesty badge + export */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <OutcomeBadge outcome={retro.outcome} />
          {retro.narrative && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400">
              <Sparkles className="h-3 w-3" />
              AI summary
            </span>
          )}
        </div>
        <ExportMenu fetchMarkdown={() => exportTaskRetro(task.id)} filename={exportFilename} />
      </div>

      {/* Durations */}
      <section>
        <SectionTitle>Timing</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatChip label="Wait" value={formatMs(retro.durations.waitMs)} />
          <StatChip label="Work" value={formatMs(retro.durations.workMs)} />
          <StatChip label="Total" value={formatMs(retro.durations.totalMs)} />
        </div>
      </section>

      {/* Narrative (AI, honesty-labeled) — absent in a deterministic skeleton */}
      {retro.narrative && (
        <section>
          <SectionTitle>Summary</SectionTitle>
          <div className="space-y-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm">
            <p className="whitespace-pre-wrap text-foreground">{retro.narrative.whatHappened}</p>
            {retro.narrative.whatTrippedIt && (
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">What tripped it: </span>
                {retro.narrative.whatTrippedIt}
              </p>
            )}
            {retro.narrative.notable.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {retro.narrative.notable.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Failure story */}
      {retro.failures.length > 0 && (
        <section>
          <SectionTitle>What tripped it</SectionTitle>
          <ul className="space-y-1.5">
            {retro.failures.map((f) => (
              <li key={f.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium text-rose-600 dark:text-rose-400">{f.class}</span>
                {f.detail && <span className="text-muted-foreground"> — {f.detail}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Review + Checks */}
      {(retro.review || retro.checks) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {retro.review && (
            <div>
              <SectionTitle>AI review</SectionTitle>
              <div className="rounded-lg border bg-card px-3 py-2 text-sm">
                <div className="font-medium text-foreground">{retro.review.verdict}</div>
                <p className="mt-1 text-muted-foreground">{retro.review.summary}</p>
              </div>
            </div>
          )}
          {retro.checks && (
            <div>
              <SectionTitle>Checks</SectionTitle>
              <div className="rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{retro.checks.status}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {retro.checks.passed} passed · {retro.checks.failed} failed
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* PR link */}
      {retro.prUrl && (
        <section>
          <SectionTitle>Pull request</SectionTitle>
          <a
            href={retro.prUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            {retro.prUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>
      )}

      {/* Attempts */}
      <section>
        <SectionTitle>Attempts</SectionTitle>
        {retro.attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agent runs recorded.</p>
        ) : (
          <ol className="space-y-1.5">
            {retro.attempts.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                <span className="text-foreground">
                  {a.retryIndex === 0 ? 'Attempt 1' : `Retry ${a.retryIndex}`}
                  <span className="ml-2 text-xs text-muted-foreground">{fmtTime(a.startedAt)}</span>
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{a.outcome ?? 'unresolved'}</span>
                  <span className="tabular-nums">{formatMs(a.durationMs)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Timeline */}
      <section>
        <SectionTitle>Timeline</SectionTitle>
        {retro.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded.</p>
        ) : (
          <ol className="space-y-2">
            {retro.timeline.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                  {fmtTime(e.at)}
                </span>
                <span className="text-foreground">
                  {e.kind}
                  {e.detail && <span className="text-muted-foreground"> — {e.detail}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/**
 * Phase 62 F — the Retrospective tab on the task detail page. Self-fetches the
 * task's retro (`GET /tasks/:id/retro`); renders the full deterministic skeleton
 * (timing, failures, review, checks, PR, attempts, timeline) plus the LLM
 * narrative when present (honesty-labeled). Terminal tasks always have a
 * skeleton; the empty state only shows during the brief window before one is
 * built (or if it 404s).
 */
export function RetroTab({ task }: { task: Task }) {
  const { data: retro, loading } = useApiData<TaskRetro | null>(
    (signal) => getTaskRetro(task.id, signal),
    [task.id],
  );

  if (loading && !retro) {
    return (
      <div className="flex justify-center py-10">
        <WidgetLoader />
      </div>
    );
  }

  if (!retro) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No retrospective yet — it&rsquo;s built when the task finishes.
      </p>
    );
  }

  return <RetroBody task={task} retro={retro} />;
}
