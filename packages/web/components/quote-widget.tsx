'use client';

import { useEffect, useState } from 'react';
import { Quote, Settings2, X } from 'lucide-react';
import {
  QUOTE_CYCLE_MAX_MS,
  QUOTE_CYCLE_MIN_MS,
  type QuoteSize,
  type WidgetConfig,
} from '@/lib/dashboard-widgets';
import { QUOTES } from '@/lib/quotes';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type QuoteWidgetProps = {
  config: WidgetConfig['quote'];
  onConfigChange: (config: WidgetConfig['quote']) => void;
};

// SignPainter is a script face that reads much smaller than its point size, so
// the scale is bumped well past normal body sizes (smallest ≈ the old largest).
const SIZE_CLASS: Record<QuoteSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const SIZES: QuoteSize[] = ['sm', 'md', 'lg'];

/** How long after a quote finishes typing before its author fades in. */
const AUTHOR_DELAY_MS = 450;

/** A different random quote each cycle, never repeating the current one. */
function nextIndex(current: number): number {
  if (QUOTES.length <= 1) return current;
  let n = current;
  while (n === current) n = Math.floor(Math.random() * QUOTES.length);
  return n;
}

/**
 * A quote that types itself out then cycles to another after a configurable
 * interval. Text size, typing speed, and cycle duration live in the settings panel.
 */
export function QuoteWidget({ config, onConfigChange }: QuoteWidgetProps) {
  const { size, typingSpeedMs, cycleMs } = config;
  const [editing, setEditing] = useState(false);
  // Deterministic initial index (avoids SSR/hydration mismatch); randomised on mount.
  const [index, setIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [showAuthor, setShowAuthor] = useState(false);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * QUOTES.length));
  }, []);

  // Cycle to a new quote every `cycleMs`.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => nextIndex(i)), cycleMs);
    return () => clearInterval(id);
  }, [cycleMs]);

  const quote = QUOTES[index]!;

  // Type the active quote out one character at a time.
  useEffect(() => {
    setCharCount(0);
    if (typingSpeedMs <= 0) {
      setCharCount(quote.text.length);
      return;
    }
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setCharCount(n);
      if (n >= quote.text.length) clearInterval(id);
    }, typingSpeedMs);
    return () => clearInterval(id);
  }, [quote.text, typingSpeedMs]);

  const typing = charCount < quote.text.length;

  // Reveal the author a short beat after the quote finishes typing; hide it again
  // whenever a new quote starts typing.
  useEffect(() => {
    if (typing) {
      setShowAuthor(false);
      return;
    }
    const id = setTimeout(() => setShowAuthor(true), AUTHOR_DELAY_MS);
    return () => clearTimeout(id);
  }, [typing]);

  const setSize = (next: QuoteSize) => onConfigChange({ ...config, size: next });
  const setTypingSpeed = (ms: number) =>
    onConfigChange({ ...config, typingSpeedMs: Math.max(0, Math.min(200, Math.round(ms))) });
  const setCycleSeconds = (secs: number) => {
    const ms = Math.min(QUOTE_CYCLE_MAX_MS, Math.max(QUOTE_CYCLE_MIN_MS, Math.round(secs) * 1000));
    onConfigChange({ ...config, cycleMs: ms });
  };

  return (
    <WidgetCard
      title="Quote"
      icon={Quote}
      actions={
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? 'Close settings' : 'Quote settings'}
          aria-pressed={editing}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
        </button>
      }
      bodyClassName={
        editing ? 'overflow-auto p-3' : 'flex flex-col items-center justify-center gap-2 p-4 text-center'
      }
    >
      {editing ? (
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Size</span>
            <div className="flex gap-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    'rounded-md border px-2 py-1 uppercase transition-colors',
                    s === size
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 text-muted-foreground hover:bg-accent',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Typing speed</span>
            <input
              type="range"
              min={0}
              max={120}
              step={5}
              // Invert so dragging right = faster (fewer ms/char).
              value={120 - Math.min(120, typingSpeedMs)}
              onChange={(e) => setTypingSpeed(120 - Number(e.target.value))}
              className="w-32 accent-primary"
              aria-label="Typing speed"
            />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Cycle (seconds)</span>
            <input
              type="number"
              min={QUOTE_CYCLE_MIN_MS / 1000}
              max={QUOTE_CYCLE_MAX_MS / 1000}
              value={Math.round(cycleMs / 1000)}
              onChange={(e) => setCycleSeconds(Number(e.target.value))}
              className="w-20 rounded-md border border-border/60 bg-transparent px-2 py-1 text-right tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </label>
        </div>
      ) : (
        <>
          <p
            className={cn('italic leading-snug', SIZE_CLASS[size])}
            style={{ fontFamily: 'var(--font-signpainter)' }}
          >
            “{quote.text.slice(0, charCount)}
            {typing && (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[0.9em] w-px translate-y-[0.1em] bg-current align-baseline animate-pulse"
              />
            )}”
          </p>
          <p
            className={cn(
              'text-xs text-muted-foreground transition-opacity duration-500',
              showAuthor ? 'opacity-100' : 'opacity-0',
            )}
          >
            — {quote.author}
          </p>
        </>
      )}
    </WidgetCard>
  );
}
