'use client';

import { Clock3 } from 'lucide-react';
import type { ClockMode } from '@/lib/dashboard-widgets';
import { useLocalStorage } from '@/lib/use-local-storage';
import { AnalogClockFace } from '@/components/analog-clock-face';

/** localStorage key for the landing-page clock's digital/analogue preference. */
export const LANDING_CLOCK_MODE_KEY = 'midnite.landing.clockMode';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * The landing-page clock: anchored to the top-centre of the hero (the top-right
 * is reserved for the header-actions cluster), centre-aligned. Hovering (or
 * keyboard-focusing) the clock reveals an icon button that cycles the display
 * between digital and analogue; the choice persists in localStorage.
 *
 * `now` is ticked by the parent page so there's a single interval on the screen.
 */
export function LandingClock({ now }: { now: Date | null }) {
  const [mode, setMode] = useLocalStorage<ClockMode>(LANDING_CLOCK_MODE_KEY, 'digital');
  const next: ClockMode = mode === 'digital' ? 'analogue' : 'digital';

  // Before the client clock resolves, hold the vertical space so nothing jumps.
  if (now === null) {
    return (
      <div
        className="absolute left-1/2 top-6 h-14 -translate-x-1/2"
        aria-hidden
      />
    );
  }

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="group absolute left-1/2 top-6 z-10 flex -translate-x-1/2 flex-col items-center text-center">
      <div className="relative flex flex-col items-center">
        {mode === 'analogue' ? (
          <div className="h-16 w-16 sm:h-20 sm:w-20">
            <AnalogClockFace date={now} />
          </div>
        ) : (
          <div className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
            {time}
          </div>
        )}

        {/* Cycle button: hidden until the clock is hovered/focused, then fades in
            just to the right so it never shifts the centred clock's layout. */}
        <button
          type="button"
          onClick={() => setMode(next)}
          aria-label={`Switch to ${next} clock`}
          title={`Switch to ${next} clock`}
          className="absolute left-full top-1/2 ml-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity duration-200 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100 motion-reduce:transition-none"
        >
          <Clock3 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-0.5 font-mono text-xs text-muted-foreground">{date}</div>
    </div>
  );
}
