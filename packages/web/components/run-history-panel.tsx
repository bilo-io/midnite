'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
} from 'lucide-react';
import type { NodeRun, WorkflowRun } from '@midnite/shared';
import { getWorkflowRun, listWorkflowRuns } from '@/lib/api';
import { VirtualList } from '@/components/ui/virtual-list';
import { useWorkflowStore } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

const RUN_STATUS_HUE: Record<WorkflowRun['status'], string> = {
  queued: '--status-backlog',
  running: '--status-wip',
  succeeded: '--status-done',
  failed: '--destructive',
  canceled: '--status-abandoned',
};

function sortedNodeRuns(nodeRuns: NodeRun[]): NodeRun[] {
  return [...nodeRuns].sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
}

export function RunHistoryPanel({
  workflowId,
  onClose,
}: {
  workflowId: string;
  onClose: () => void;
}) {
  const applyRunState = useWorkflowStore((s) => s.applyRunState);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listWorkflowRuns(workflowId)
      .then((r) => { if (!cancelled) setRuns(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load runs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workflowId]);

  const sorted = useMemo(
    () => (activeRun ? sortedNodeRuns(activeRun.nodeRuns) : []),
    [activeRun],
  );
  const maxStep = sorted.length;

  // Paint canvas nodes at the current replay step.
  useEffect(() => {
    applyRunState(sorted.slice(0, step));
  }, [applyRunState, sorted, step]);

  // Auto-advance: re-arms after each step so there's no stale-closure on maxStep.
  useEffect(() => {
    if (!playing) return;
    if (step >= maxStep) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(id);
  }, [playing, step, maxStep]);

  const selectRun = async (run: WorkflowRun) => {
    setPlaying(false);
    let full = run;
    if (run.nodeRuns.length === 0) {
      try { full = await getWorkflowRun(workflowId, run.id); } catch { /* use list item */ }
    }
    setActiveRun(full);
    setStep(0);
  };

  const backToList = () => {
    setPlaying(false);
    setActiveRun(null);
    setStep(0);
    applyRunState([]);
  };

  const exitReplay = () => {
    backToList();
    onClose();
  };

  return (
    <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-border/60 surface-glass">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2">
        <span className="text-xs font-semibold text-foreground">Run history</span>
        <button
          type="button"
          onClick={exitReplay}
          aria-label="Close run history"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {activeRun ? (
        <ReplayPlayer
          run={activeRun}
          sorted={sorted}
          step={step}
          maxStep={maxStep}
          playing={playing}
          onStep={(s) => { setPlaying(false); setStep(s); }}
          onPlay={() => { if (step >= maxStep) setStep(0); setPlaying(true); }}
          onPause={() => setPlaying(false)}
          onBack={backToList}
        />
      ) : (
        <RunList runs={runs} loading={loading} error={error} onSelect={(r) => void selectRun(r)} />
      )}
    </div>
  );
}

function RunList({
  runs,
  loading,
  error,
  onSelect,
}: {
  runs: WorkflowRun[];
  loading: boolean;
  error: string | null;
  onSelect: (run: WorkflowRun) => void;
}) {
  if (loading) return <p className="px-4 py-3 text-xs text-muted-foreground">Loading runs…</p>;
  if (error) return <p className="px-4 py-3 text-xs text-destructive">{error}</p>;
  if (runs.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        No runs yet — press Run to execute this workflow.
      </p>
    );
  }
  return (
    <VirtualList
      items={runs}
      rowKey={(run) => run.id}
      estimateRow={41}
      className="flex-1"
      renderRow={(run) => (
        <button
          type="button"
          onClick={() => onSelect(run)}
          className="flex w-full items-center gap-2 border-b border-border/30 px-4 py-2.5 text-left text-xs transition-colors hover:bg-muted/40"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `hsl(var(${RUN_STATUS_HUE[run.status]}))` }}
          />
          <span className="font-medium capitalize">{run.status}</span>
          <span className="ml-auto shrink-0 text-muted-foreground">
            {new Date(run.startedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </button>
      )}
    />
  );
}

function ReplayPlayer({
  run,
  sorted,
  step,
  maxStep,
  playing,
  onStep,
  onPlay,
  onPause,
  onBack,
}: {
  run: WorkflowRun;
  sorted: NodeRun[];
  step: number;
  maxStep: number;
  playing: boolean;
  onStep: (s: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onBack: () => void;
}) {
  const pct = maxStep > 0 ? (step / maxStep) * 100 : 0;
  const current = sorted[step - 1];

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Run summary */}
      <div className="rounded-md border border-border/50 surface-glass px-3 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `hsl(var(${RUN_STATUS_HUE[run.status]}))` }}
          />
          <span className="text-xs font-medium capitalize">{run.status}</span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {new Date(run.startedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] capitalize text-muted-foreground">
          {run.triggerSource} trigger
        </p>
      </div>

      {/* Step counter */}
      <div className="text-center text-xs font-medium text-muted-foreground tabular-nums">
        Step {step} / {maxStep}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Current node label */}
      <div className="min-h-[32px] text-center text-[11px]">
        {current ? (
          <span>
            <span className="font-medium text-foreground">{current.nodeType}</span>
            {current.status ? (
              <span className="text-muted-foreground"> — {current.status}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {step === 0 ? 'Press ▶ or step forward' : null}
          </span>
        )}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-1">
        <IconBtn label="First step" onClick={() => onStep(0)}>
          <ChevronFirst className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Previous step" onClick={() => onStep(Math.max(0, step - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </IconBtn>
        {playing ? (
          <IconBtn label="Pause" onClick={onPause}>
            <Pause className="h-4 w-4" />
          </IconBtn>
        ) : (
          <IconBtn label="Play" onClick={onPlay}>
            <Play className="h-4 w-4" />
          </IconBtn>
        )}
        <IconBtn label="Next step" onClick={() => onStep(Math.min(maxStep, step + 1))}>
          <ChevronRight className="h-4 w-4" />
        </IconBtn>
        <IconBtn label="Last step" onClick={() => onStep(maxStep)}>
          <ChevronLast className="h-4 w-4" />
        </IconBtn>
      </div>

      <button
        type="button"
        onClick={onBack}
        className={cn(
          'mt-auto text-[11px] text-muted-foreground transition-colors hover:text-foreground',
        )}
      >
        ← Back to run list
      </button>
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
