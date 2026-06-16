'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function CalendarWidget() {
  const [today, setToday] = useState(() => new Date());
  // Months offset from the current month (0 = this month).
  const [offset, setOffset] = useState(0);

  // Roll "today" over at the next local midnight.
  useEffect(() => {
    const midnight = new Date(today);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setToday(new Date()), midnight.getTime() - today.getTime());
    return () => clearTimeout(id);
  }, [today]);

  const view = useMemo(() => new Date(today.getFullYear(), today.getMonth() + offset, 1), [today, offset]);

  const cells = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Monday-start leading blanks.
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const out: Array<Date | null> = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    return out;
  }, [view]);

  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <WidgetCard
      title="Calendar"
      icon={CalendarDays}
      actions={
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Previous month"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 1)}
            aria-label="Next month"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      }
      bodyClassName="flex flex-col p-3"
    >
      <p className="mb-2 text-center text-sm font-medium">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid flex-1 auto-rows-fr grid-cols-7 gap-1 text-center text-xs">
        {cells.map((date, i) => (
          <span
            key={i}
            className={cn(
              'flex items-center justify-center rounded-md tabular-nums',
              date && sameDay(date, today)
                ? 'bg-primary font-semibold text-primary-foreground'
                : date
                  ? 'text-foreground'
                  : '',
            )}
          >
            {date?.getDate() ?? ''}
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}
