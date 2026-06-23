'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import type { CheckRun } from '@midnite/shared';
import { getCheckRuns, triggerCheck } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function triggerLabel(trigger: CheckRun['trigger']): string {
  switch (trigger) {
    case 'gate': return 'Gate';
    case 'manual': return 'Manual';
    case 'auto-fix': return 'Auto-fix';
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function PassFailBadge({ passed }: { passed: boolean }) {
  return passed ? (
    <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
      <CheckCircle2 aria-hidden className="h-3 w-3" />
      Passed
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
      <XCircle aria-hidden className="h-3 w-3" />
      Failed
    </span>
  );
}

function CheckResultRow({ result }: { result: CheckRun['results'][number] }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = result.output.trim().length > 0;

  return (
    <div className="rounded border bg-muted/40 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {result.passed ? (
            <CheckCircle2 aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-success" />
          ) : (
            <XCircle aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-destructive" />
          )}
          <span className="truncate text-sm font-medium">{result.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock aria-hidden className="h-3 w-3" />
            {formatDuration(result.durationMs)}
          </span>
          {result.exitCode !== null && (
            <span className="text-[10px] text-muted-foreground">exit {result.exitCode}</span>
          )}
          {hasOutput && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="text-[10px] text-muted-foreground underline-offset-2 hover:underline"
              aria-expanded={expanded}
            >
              {expanded ? 'hide' : 'output'}
            </button>
          )}
        </div>
      </div>
      {expanded && hasOutput && (
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-all">
          {result.output}
        </pre>
      )}
    </div>
  );
}

function CheckRunSummary({
  run,
  label,
  defaultOpen = false,
}: {
  run: CheckRun;
  label: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-md border', run.passed ? 'border-success/30' : 'border-destructive/30')}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          {run.passed ? (
            <ShieldCheck aria-hidden className="h-4 w-4 flex-shrink-0 text-success" />
          ) : (
            <ShieldAlert aria-hidden className="h-4 w-4 flex-shrink-0 text-destructive" />
          )}
          <span className="truncate text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">{triggerLabel(run.trigger)}</span>
          <PassFailBadge passed={run.passed} />
          <span className="text-[10px] text-muted-foreground">{formatTimestamp(run.finishedAt)}</span>
          <span aria-hidden className="text-muted-foreground">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t px-3 pb-3 pt-2">
          {run.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No individual checks recorded.</p>
          ) : (
            run.results.map((r) => <CheckResultRow key={r.name} result={r} />)
          )}
        </div>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export interface ChecksPanelProps {
  taskId: string;
}

/**
 * Shows all check runs for a task and provides a "Re-run checks" button
 * (Phase 30 Theme D). Fetches on mount; manual re-run triggers `POST /tasks/:id/check`
 * and refreshes the list. Pass/fail shown per-check with expandable output.
 */
export function ChecksPanel({ taskId }: ChecksPanelProps) {
  const [runs, setRuns] = useState<CheckRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCheckRuns(taskId)
      .then((res) => {
        if (!cancelled) setRuns(res.runs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load checks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function handleReRun() {
    setRunning(true);
    setRunError(null);
    try {
      const { run } = await triggerCheck(taskId);
      // Append the new run and refresh the full list to keep ordering consistent.
      const res = await getCheckRuns(taskId);
      setRuns(res.runs);
      // If the run was a no-op stub (zero results) surface a gentle note.
      if (run.results.length === 0 && run.passed) {
        setRunError('Checks are not configured for this task — nothing to run.');
      }
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to run checks');
    } finally {
      setRunning(false);
    }
  }

  const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;
  const olderRuns = runs.length > 1 ? runs.slice(0, -1).reverse() : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Quality Gate</h3>
        <button
          type="button"
          onClick={() => void handleReRun()}
          disabled={running}
          className={cn(
            'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
            'bg-muted hover:bg-muted/80 text-foreground',
            running && 'cursor-not-allowed opacity-60',
          )}
          aria-label="Re-run checks"
        >
          <RotateCcw aria-hidden className={cn('h-3 w-3', running && 'animate-spin')} />
          {running ? 'Running…' : 'Re-run checks'}
        </button>
      </div>

      {/* Mutation error */}
      {runError && (
        <p className="rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{runError}</p>
      )}

      {/* Loading / error / empty states */}
      {loading && <p className="text-sm text-muted-foreground">Loading checks…</p>}
      {!loading && error && (
        <p className="rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">{error}</p>
      )}
      {!loading && !error && runs.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No checks have been run for this task yet.
        </p>
      )}

      {/* Latest run */}
      {!loading && latestRun && (
        <CheckRunSummary run={latestRun} label="Latest run" defaultOpen />
      )}

      {/* Older runs (collapsed) */}
      {!loading && olderRuns.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
            {olderRuns.length} older run{olderRuns.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {olderRuns.map((run) => (
              <CheckRunSummary key={run.id} run={run} label={formatTimestamp(run.finishedAt)} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
