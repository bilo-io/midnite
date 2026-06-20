'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Settings2, Timer, X } from 'lucide-react';
import type { WidgetConfig } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type TimerWidgetProps = {
  config: WidgetConfig['timer'];
  onConfigChange: (config: WidgetConfig['timer']) => void;
};

type Phase = 'work' | 'break';

// Progress-ring geometry (viewBox is 0 0 120 120).
const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TimerWidget({ config, onConfigChange }: TimerWidgetProps) {
  const { workMin, breakMin } = config;
  const [phase, setPhase] = useState<Phase>('work');
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [editing, setEditing] = useState(false);

  const durationFor = useCallback(
    (p: Phase) => (p === 'work' ? workMin : breakMin) * 60,
    [workMin, breakMin],
  );

  const reset = useCallback(() => {
    setRunning(false);
    setPhase('work');
    setSecondsLeft(workMin * 60);
  }, [workMin]);

  // Re-seed the countdown when durations change while idle (e.g. config edit).
  const startedRef = useRef(false);
  useEffect(() => {
    if (!running && !startedRef.current) setSecondsLeft(durationFor(phase));
  }, [durationFor, phase, running]);

  useEffect(() => {
    if (!running) return;
    startedRef.current = true;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) return s - 1;
        // Phase complete — flip to the other phase and keep running.
        const next: Phase = phase === 'work' ? 'break' : 'work';
        setPhase(next);
        startedRef.current = false;
        return durationFor(next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, durationFor]);

  const total = durationFor(phase);
  // Fraction of time remaining — the ring is full at the start and drains to empty.
  const fraction = total > 0 ? secondsLeft / total : 0;

  const setMinutes = (key: 'workMin' | 'breakMin', value: number) => {
    const clamped = Math.max(1, Math.min(120, Math.round(value)));
    onConfigChange({ ...config, [key]: clamped });
  };

  return (
    <WidgetCard
      title="Focus timer"
      icon={Timer}
      actions={
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? 'Close settings' : 'Timer settings'}
          aria-pressed={editing}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
        </button>
      }
      bodyClassName="flex flex-col items-center justify-center gap-3 p-4"
    >
      {editing ? (
        <div className="flex w-full flex-col gap-2 text-xs">
          <MinuteField label="Work (min)" value={workMin} onChange={(v) => setMinutes('workMin', v)} />
          <MinuteField label="Break (min)" value={breakMin} onChange={(v) => setMinutes('breakMin', v)} />
        </div>
      ) : (
        <>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              phase === 'work' ? 'bg-primary/15 text-primary' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            )}
          >
            {phase}
          </span>
          <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90" aria-hidden>
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                strokeWidth="8"
                className="stroke-border/50"
              />
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn(
                  'transition-[stroke-dashoffset] duration-1000 ease-linear',
                  phase === 'work' ? 'stroke-primary' : 'stroke-emerald-500',
                )}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - fraction)}
              />
            </svg>
            <span className="absolute text-2xl font-semibold tabular-nums leading-none">
              {format(secondsLeft)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              aria-label={running ? 'Pause' : 'Start'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Reset"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </WidgetCard>
  );
}

function MinuteField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="number"
        min={1}
        max={120}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-md border border-border/60 bg-transparent px-2 py-1 text-right tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </label>
  );
}
