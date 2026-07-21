'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { ClockMode, WidgetConfig } from '@/lib/dashboard-widgets';
import { useLocaleFormat } from '@/lib/use-locale-format';
import { cn } from '@/lib/utils';
import { AnalogClockFace } from './analog-clock-face';
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
  const { dateTime } = useLocaleFormat();
  // 24-hour clock (h23) so there's no AM/PM; digit glyphs + separators follow the locale.
  const time = dateTime(date, {
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return <span className="text-4xl font-semibold tabular-nums tracking-tight">{time}</span>;
}

function AnalogueClock({ date }: { date: Date }) {
  return <AnalogClockFace date={date} className="max-h-40" />;
}
