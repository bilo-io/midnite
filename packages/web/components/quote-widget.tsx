'use client';

import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { quoteOfDay } from '@/lib/quotes';
import { WidgetCard } from './widget-card';

/** A quote that changes once per local day. Re-renders at the next midnight. */
export function QuoteWidget() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const id = setTimeout(() => setNow(Date.now()), midnight.getTime() - now);
    return () => clearTimeout(id);
  }, [now]);

  const quote = quoteOfDay(now);

  return (
    <WidgetCard title="Quote" icon={Quote} bodyClassName="flex flex-col justify-center gap-2 p-4 text-center">
      <p className="text-sm font-medium leading-snug">“{quote.text}”</p>
      <p className="text-xs text-muted-foreground">— {quote.author}</p>
    </WidgetCard>
  );
}
