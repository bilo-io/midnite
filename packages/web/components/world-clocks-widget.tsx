'use client';

import { useEffect, useState } from 'react';
import { Globe, Settings2, Trash2, X } from 'lucide-react';
import type { WidgetConfig, WorldClockZone } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type WorldClocksWidgetProps = {
  config: WidgetConfig['world-clocks'];
  onConfigChange: (config: WidgetConfig['world-clocks']) => void;
};

function isValidTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function timeIn(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date);
  } catch {
    return '—';
  }
}

/** Minutes a timezone is ahead of UTC at `date` (negative = behind). */
function offsetFromUtcMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  // The instant, expressed as the wall clock the zone shows, read back as if UTC.
  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * A zone's offset relative to the viewer's local time, e.g. `+3h`, `−5:30`, or
 * `same`. Computed = zone-offset-from-UTC minus local-offset-from-UTC.
 */
export function offsetLabel(date: Date, tz: string): string {
  try {
    // getTimezoneOffset is minutes to add to local to reach UTC, so local's
    // offset from UTC is its negation.
    const rel = offsetFromUtcMinutes(date, tz) + date.getTimezoneOffset();
    if (rel === 0) return 'same';
    const sign = rel > 0 ? '+' : '−';
    const abs = Math.abs(rel);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `${sign}${h}h` : `${sign}${h}:${String(m).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export function WorldClocksWidget({ config, onConfigChange }: WorldClocksWidgetProps) {
  const [now, setNow] = useState(() => new Date());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const { zones } = config;

  const removeZone = (index: number) =>
    onConfigChange({ zones: zones.filter((_, i) => i !== index) });
  const addZone = (zone: WorldClockZone) => onConfigChange({ zones: [...zones, zone] });

  return (
    <WidgetCard
      title="World clocks"
      icon={Globe}
      actions={
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? 'Done editing' : 'Edit timezones'}
          aria-pressed={editing}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
        </button>
      }
      bodyClassName="overflow-auto"
    >
      {editing ? (
        <ZoneEditor zones={zones} onAdd={addZone} onRemove={removeZone} />
      ) : zones.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No timezones — add one with the gear.</p>
      ) : (
        <ul className="divide-y divide-border/30">
          {zones.map((z, i) => (
            <li key={`${z.tz}-${i}`} className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="min-w-0 truncate text-sm font-medium">{z.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-sm tabular-nums text-muted-foreground">{timeIn(now, z.tz)}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                  {offsetLabel(now, z.tz)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function ZoneEditor({
  zones,
  onAdd,
  onRemove,
}: {
  zones: WorldClockZone[];
  onAdd: (zone: WorldClockZone) => void;
  onRemove: (index: number) => void;
}) {
  const [label, setLabel] = useState('');
  const [tz, setTz] = useState('');
  const valid = label.trim() !== '' && isValidTz(tz.trim());

  const submit = () => {
    if (!valid) return;
    onAdd({ label: label.trim(), tz: tz.trim() });
    setLabel('');
    setTz('');
  };

  return (
    <div className="space-y-2 p-3">
      {zones.length > 0 && (
        <ul className="space-y-1">
          {zones.map((z, i) => (
            <li key={`${z.tz}-${i}`} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate">
                {z.label} <span className="text-muted-foreground">· {z.tz}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${z.label}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Berlin)"
          className="rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="IANA zone (e.g. Europe/Berlin)"
          className={cn(
            'rounded-md border bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            tz.trim() !== '' && !isValidTz(tz.trim()) ? 'border-destructive/60' : 'border-border/60',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add timezone
        </button>
      </div>
    </div>
  );
}
