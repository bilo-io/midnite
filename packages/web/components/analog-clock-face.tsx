'use client';

import { cn } from '@/lib/utils';

/**
 * A presentational analogue clock face — the SVG hands + ticks, no state of its
 * own (the caller ticks `date`). Shared by the dashboard `ClockWidget` and the
 * landing-page corner clock so the hand geometry lives in exactly one place.
 */
export function AnalogClockFace({ date, className }: { date: Date; className?: string }) {
  const s = date.getSeconds();
  const m = date.getMinutes();
  const h = date.getHours() % 12;
  // Degrees clockwise from 12 o'clock.
  const secDeg = s * 6;
  const minDeg = m * 6 + s * 0.1;
  const hourDeg = h * 30 + m * 0.5;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn('h-full w-auto', className)}
      role="img"
      aria-label="Analogue clock"
    >
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
