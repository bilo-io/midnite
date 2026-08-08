'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { StatusPills } from '@/components/status-pills';
import { Spinner } from '@/components/spinner';
import { LandingClock } from '@/components/landing-clock';
import { LandingWeather } from '@/components/landing-weather';
import { LandingSystemMonitor } from '@/components/landing-system-monitor';
import { SUBGREETINGS, windowForTime } from '@/lib/landing-greetings';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  CYCLE_MAX_S,
  CYCLE_MIN_S,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';

export default function HomePage() {
  const t = useTranslations('dashboard');
  const [greeting, setGreeting] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [subgreeting, setSubgreeting] = useState<string | null>(null);
  const [typedSub, setTypedSub] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [settings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const cycleMs =
    Math.min(CYCLE_MAX_S, Math.max(CYCLE_MIN_S, settings.cycleDurationS)) * 1000;

  // Resolve client-only state after mount.
  useEffect(() => {
    const nowDate = new Date();
    const window = windowForTime(nowDate.getHours(), nowDate.getMinutes());
    const greetingKey = `landing.greetings.${window.timeOfDay}`;
    setGreeting(t.has(greetingKey) ? t(greetingKey) : window.greeting);
    const index = Math.floor(Math.random() * SUBGREETINGS.length);
    const subKey = `landing.subgreetings.${index}`;
    setSubgreeting(t.has(subKey) ? t(subKey) : SUBGREETINGS[index] ?? SUBGREETINGS[0]!);
    setNow(new Date());
    // `t` is stable for a given locale; re-running on a language change would restart the
    // typing animation mid-flight, so the greeting is resolved once per mount on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the clock every second.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Hold a blinking cursor for 1s, then type the greeting out character by character.
  useEffect(() => {
    if (greeting === null) return;
    const full = `${greeting}`;
    let index = 0;
    let typeTimer: ReturnType<typeof setInterval>;
    const startDelay = setTimeout(() => {
      typeTimer = setInterval(() => {
        index += 1;
        setTyped(full.slice(0, index));
        if (index >= full.length) clearInterval(typeTimer);
      }, 80);
    }, 1000);
    return () => {
      clearTimeout(startDelay);
      clearInterval(typeTimer);
    };
  }, [greeting]);

  const titleDone = greeting !== null && typed.length === `${greeting}`.length;

  // Once the title is done, type the subtitle out character by character. Reruns
  // whenever the phrase rotates, clearing first so the new one types in clean.
  useEffect(() => {
    if (!titleDone || subgreeting === null) return;
    setTypedSub('');
    let index = 0;
    const typeTimer = setInterval(() => {
      index += 1;
      setTypedSub(subgreeting.slice(0, index));
      if (index >= subgreeting.length) clearInterval(typeTimer);
    }, 35);
    return () => clearInterval(typeTimer);
  }, [titleDone, subgreeting]);

  // Swap the subtitle for a fresh random phrase every cycle once the title's in,
  // avoiding an immediate repeat. The typing effect above re-types it.
  useEffect(() => {
    if (!titleDone) return;
    const id = setInterval(() => {
      setSubgreeting((current) => {
        if (SUBGREETINGS.length <= 1) return current;
        let next = current;
        while (next === current) {
          next = SUBGREETINGS[Math.floor(Math.random() * SUBGREETINGS.length)] ?? current;
        }
        return next;
      });
    }, cycleMs);
    return () => clearInterval(id);
  }, [titleDone, cycleMs]);

  const subDone = subgreeting !== null && typedSub.length === subgreeting.length;

  // Reveal the pills once the first subtitle lands, then latch them on — later
  // phrase rotations re-type the subtitle but must not re-trigger the reveal.
  const [pillsRevealed, setPillsRevealed] = useState(false);
  useEffect(() => {
    if (subDone) setPillsRevealed(true);
  }, [subDone]);

  return (
    <div
      // Transparent: the app-wide <AppBackdrop/> (starfield by default) shows
      // through from the layout, so the landing shares the one backdrop rather
      // than mounting its own canvas. The viewport height subtracts the desktop
      // title bar (the layout already pads by --titlebar-h) so the landing never
      // overflows into a 48px document scroll on desktop.
      className="relative flex min-h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col items-center justify-center px-6 text-center"
    >
      <LandingWeather />
      <LandingClock now={now} />
      <LandingSystemMonitor />

      <div className="mb-10">
        <Spinner />
      </div>

      <h1 className="bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text pb-3 text-4xl font-semibold leading-[1.15] tracking-tight text-transparent sm:text-6xl">
        {typed}
        {!titleDone && (
          <span
            className="ml-0.5 inline-block w-[0.06em] self-stretch bg-foreground align-baseline text-transparent animate-[blink_1s_step-end_infinite]"
            aria-hidden
          >
            |
          </span>
        )}
      </h1>

      <p
        className={`mt-4 text-sm text-muted-foreground transition-opacity duration-300 ${
          titleDone ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {typedSub}
        {titleDone && (
          <span
            className={`ml-px inline-block w-px self-stretch bg-muted-foreground align-baseline text-transparent ${
              subDone ? 'animate-pulse' : 'animate-[blink_1s_step-end_infinite]'
            }`}
            aria-hidden
          >
            |
          </span>
        )}
      </p>

      <StatusPills
        className={`mt-9 transition-opacity duration-500 ${
          pillsRevealed ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
    </div>
  );
}
