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
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{timeIn(now, z.tz)}</span>
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
