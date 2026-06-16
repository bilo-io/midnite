'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { WidgetCard } from './widget-card';

/** Today's date. Re-renders once at the next local midnight. */
export function DateWidget() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setNow(new Date()), midnight.getTime() - now.getTime());
    return () => clearTimeout(id);
  }, [now]);

  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const month = now.toLocaleDateString(undefined, { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();

  return (
    <WidgetCard title="Date" icon={Calendar} bodyClassName="flex flex-col items-center justify-center gap-1 p-4 text-center">
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{weekday}</span>
      <span className="text-5xl font-semibold tabular-nums leading-none">{day}</span>
      <span className="text-sm text-muted-foreground">
        {month} {year}
      </span>
    </WidgetCard>
  );
}
