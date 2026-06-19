'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { ClockMode, WidgetConfig } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type ClockWidgetProps = {
  config: WidgetConfig['clock'];
  onConfigChange: (config: WidgetConfig['clock']) => void;
};

export function ClockWidget({ config, onConfigChange }: ClockWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const setMode = (mode: ClockMode) => onConfigChange({ ...config, mode });

  return (
    <WidgetCard
      title="Clock"
      icon={Clock}
      actions={
        <div className="flex items-center rounded-md border border-border/60 p-0.5 text-[10px]">
          {(['digital', 'analogue'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMode(mode)}
              className={cn(
                'rounded px-1.5 py-0.5 capitalize transition-colors',
                config.mode === mode ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={config.mode === mode}
            >
              {mode}
            </button>
          ))}
        </div>
      }
      bodyClassName="flex items-center justify-center p-4"
    >
      {config.mode === 'analogue' ? <AnalogueClock date={now} /> : <DigitalClock date={now} />}
    </WidgetCard>
  );
}

function DigitalClock({ date }: { date: Date }) {
  // 24-hour clock (h23) so there's no AM/PM.
  const time = date.toLocaleTimeString(undefined, {
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return <span className="text-4xl font-semibold tabular-nums tracking-tight">{time}</span>;
}

function AnalogueClock({ date }: { date: Date }) {
  const s = date.getSeconds();
  const m = date.getMinutes();
  const h = date.getHours() % 12;
  // Degrees clockwise from 12 o'clock.
  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hourDeg = h * 30 + m * 0.5;

  return (
    <svg viewBox="0 0 100 100" className="h-full max-h-40 w-auto" role="img" aria-label="Analogue clock">
      <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
      {Array.from({ length: 12 }).map((_, i) => (
        <line
          key={i}
          x1="50"
          y1="8"
          x2="50"
          y2={i % 3 === 0 ? '14' : '11'}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={i % 3 === 0 ? 2 : 1}
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      {/* hour */}
      <line x1="50" y1="50" x2="50" y2="28" stroke="hsl(var(--foreground))" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${hourDeg} 50 50)`} />
      {/* minute */}
      <line x1="50" y1="50" x2="50" y2="18" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
      {/* second */}
      <line x1="50" y1="54" x2="50" y2="14" stroke="hsl(var(--primary))" strokeWidth="1" strokeLinecap="round" transform={`rotate(${secDeg} 50 50)`} />
      <circle cx="50" cy="50" r="2.5" fill="hsl(var(--primary))" />
    </svg>
  );
}
