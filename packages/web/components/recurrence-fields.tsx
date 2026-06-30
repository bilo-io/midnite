'use client';

import {
  cronToPreset,
  describeCron,
  formatRun,
  nextRuns,
  presetToCron,
  DAY_LABELS,
  type RecurrenceKind,
  type RecurrencePreset,
} from '@/lib/cron';
import { cn } from '@/lib/utils';

// A self-contained recurrence picker — the friendly Repeats/time/day controls plus
// a raw-cron escape hatch and a "next runs" preview, all driven by the pure cron
// helpers (Phase 45 B). Mirrors the workflow node-config ScheduleFields, but takes a
// plain `{ cron, timezone }` value + onChange so the Schedules facade form can reuse
// it without the workflow store.

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';
const SELECT_CLASS = INPUT_CLASS;

const MODE_LABELS: Array<{ value: RecurrenceKind | 'custom'; label: string }> = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'custom', label: 'Custom (cron)' },
];

export function RecurrenceFields({
  cron,
  timezone,
  onChange,
  disabled,
}: {
  cron: string;
  timezone: string;
  onChange: (next: { cron: string; timezone: string }) => void;
  disabled?: boolean;
}) {
  const preset = cronToPreset(cron);
  const mode: RecurrenceKind | 'custom' = preset?.kind ?? 'custom';
  const time = preset && 'time' in preset ? preset.time : '09:00';
  const weeklyDay = preset?.kind === 'weekly' ? preset.day : 1;
  const monthlyDom = preset?.kind === 'monthly' ? preset.dom : 1;
  const runs = nextRuns(cron, timezone, 3);

  const setCron = (next: string) => onChange({ cron: next, timezone });
  const apply = (p: RecurrencePreset) => setCron(presetToCron(p));

  const onMode = (next: string) => {
    switch (next) {
      case 'daily':
        return apply({ kind: 'daily', time });
      case 'weekdays':
        return apply({ kind: 'weekdays', time });
      case 'weekly':
        return apply({ kind: 'weekly', day: weeklyDay, time });
      case 'monthly':
        return apply({ kind: 'monthly', dom: monthlyDom, time });
      // 'custom' — keep the current expression; the raw field below is the editor.
    }
  };

  const onTime = (t: string) => {
    const next = t || '09:00';
    if (mode === 'daily') apply({ kind: 'daily', time: next });
    else if (mode === 'weekdays') apply({ kind: 'weekdays', time: next });
    else if (mode === 'weekly') apply({ kind: 'weekly', day: weeklyDay, time: next });
    else if (mode === 'monthly') apply({ kind: 'monthly', dom: monthlyDom, time: next });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Repeats</label>
        <select
          className={SELECT_CLASS}
          value={mode}
          onChange={(e) => onMode(e.target.value)}
          disabled={disabled}
          aria-label="Recurrence"
        >
          {MODE_LABELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {mode !== 'custom' ? (
        <div className="flex gap-2">
          {mode === 'weekly' ? (
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Day</label>
              <select
                className={SELECT_CLASS}
                value={String(weeklyDay)}
                onChange={(e) => apply({ kind: 'weekly', day: Number(e.target.value), time })}
                disabled={disabled}
                aria-label="Day of week"
              >
                {DAY_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {mode === 'monthly' ? (
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Day of month</label>
              <input
                type="number"
                min={1}
                max={31}
                className={INPUT_CLASS}
                value={monthlyDom}
                onChange={(e) =>
                  apply({ kind: 'monthly', dom: Math.min(31, Math.max(1, Number(e.target.value) || 1)), time })
                }
                disabled={disabled}
                aria-label="Day of month"
              />
            </div>
          ) : null}
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Time</label>
            <input
              type="time"
              className={INPUT_CLASS}
              value={time}
              onChange={(e) => onTime(e.target.value)}
              disabled={disabled}
              aria-label="Time"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Cron expression</label>
        <input
          className={cn(INPUT_CLASS, 'font-mono')}
          value={cron}
          onChange={(e) => setCron(e.target.value)}
          disabled={disabled}
          placeholder="0 9 * * *"
          aria-label="Cron expression"
        />
        <p className="text-[11px] text-muted-foreground">{describeCron(cron)}</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Timezone</label>
        <input
          className={INPUT_CLASS}
          value={timezone}
          onChange={(e) => onChange({ cron, timezone: e.target.value || 'UTC' })}
          disabled={disabled}
          placeholder="UTC"
          aria-label="Timezone"
        />
      </div>

      {runs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground">Next runs</p>
          <ul className="space-y-0.5">
            {runs.map((d, i) => (
              <li key={i} className="font-mono text-[11px] text-muted-foreground">
                {formatRun(d, timezone)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[11px] text-destructive">This expression never fires — check the cron.</p>
      )}
    </div>
  );
}
