'use client';

import { useEffect, useState } from 'react';
import { StatusPills } from '@/components/status-pills';
import { Spinner } from '@/components/spinner';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  CYCLE_MAX_S,
  CYCLE_MIN_S,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';

type TimeOfDay =
  | 'midnight'
  | 'dawn'
  | 'morning'
  | 'midMorning'
  | 'forenoon'
  | 'noon'
  | 'afternoon'
  | 'dusk'
  | 'earlyEvening'
  | 'evening'
  | 'night';

type GreetingWindow = {
  startHour: number; // inclusive, in decimal hours (e.g. 12 + 1/60 === 12:01)
  endHour: number; // exclusive; an entry where endHour < startHour wraps past midnight
  timeOfDay: TimeOfDay;
  greeting: string;
};

// Windows run earliest→latest and are matched in order, so the instant-wide noon
// window wins over the afternoon range that surrounds it. Decimal hours let us pin
// minute-level boundaries (the noon window ends at 12:01), and the trailing night
// window wraps past midnight.
const GREETING_WINDOWS: readonly GreetingWindow[] = [
  { startHour: 0, endHour: 4, timeOfDay: 'midnight', greeting: 'early bird? or night owl?' },
  { startHour: 4, endHour: 6, timeOfDay: 'dawn', greeting: 'rising to the occasion?' },
  { startHour: 6, endHour: 8, timeOfDay: 'morning', greeting: 'good morning' },
  { startHour: 8, endHour: 11, timeOfDay: 'midMorning', greeting: 'vibing yet? its past morning' },
  { startHour: 10, endHour: 12, timeOfDay: 'forenoon', greeting: 'vibe some sessions before lunch' },
  { startHour: 12, endHour: 13, timeOfDay: 'noon', greeting: 'middle of the day! hello!' },
  { startHour: 13, endHour: 16, timeOfDay: 'afternoon', greeting: 'good afternoon' },
  { startHour: 16, endHour: 18, timeOfDay: 'dusk', greeting: 'final push for the day... you got this!' },
  { startHour: 17, endHour: 19, timeOfDay: 'earlyEvening', greeting: 'good early evening' },
  { startHour: 19, endHour: 21, timeOfDay: 'evening', greeting: 'good evening' },
  { startHour: 21, endHour: 1, timeOfDay: 'night', greeting: 'howzit nightowl' },
];

// Greeting depends on the viewer's local time, so resolve it on the client after
// mount to avoid a server/client hydration mismatch.
function greetingForTime(hour: number, minute: number): string {
  const t = hour + minute / 60;
  const match = GREETING_WINDOWS.find(({ startHour, endHour }) =>
    startHour <= endHour ? t >= startHour && t < endHour : t >= startHour || t < endHour,
  );
  return (match ?? GREETING_WINDOWS[GREETING_WINDOWS.length - 1]!).greeting;
}

const SUBGREETINGS = [
  'go smash it today',
  'your agents are ready',
  'let the swarm cook',
  'time to ship something wild',
  'crushing it, one task at a time',
  'orchestrate the chaos',
  'a thousand agents await',
  'midnight oil, zero burnout',
  'let the machines do the grind',
  'parallel everything',
  'make the robots earn their keep',
  'today we automate the impossible',
  'spin up, ship out',
  'your fleet is fuelled and waiting',
  'less typing, more shipping',
  'agentic and unstoppable',
  'queue it, watch it fly',
  'the future runs in parallel',
  'delegate to the silicon',
  'small tasks, big velocity',
  'let intelligence compound',
  'no task too small, no swarm too big',
  'build like it is midnight',
  'autonomy at your fingertips',
  'every agent pulling its weight',
  'ship while you sleep',
  'turn intent into output',
  'the agents have your back',
  'momentum is a setting here',
  'dream it, queue it, done',
  'maximum throughput, minimum fuss',
  'concurrency is a lifestyle',
  'let a hundred agents bloom',
  'flow state, fully automated',
  'crush the backlog tonight',
  'your second brain has hands',
  'tasks in, magic out',
  'the orchestra is tuning up',
  'point, click, deploy an army',
  'work smarter, swarm harder',
  'idle agents are wasted agents',
  'velocity unlocked',
  'let the pipeline rip',
  'a calmer kind of busy',
  'set the pace, agents follow',
  'productivity on autopilot',
  'tonight we move fast',
  'the grind is now optional',
  'compounding effort, zero sweat',
  'ready when you are',
];

export default function HomePage() {
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
    setGreeting(greetingForTime(nowDate.getHours(), nowDate.getMinutes()));
    const pick = SUBGREETINGS[Math.floor(Math.random() * SUBGREETINGS.length)];
    setSubgreeting(pick ?? 'ready when you are');
    setNow(new Date());
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
    <div className="bg-grid relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <Clock now={now} />

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

function Clock({ now }: { now: Date | null }) {
  if (now === null) {
    return <div className="absolute right-6 top-6 h-10" aria-hidden />;
  }

  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = `${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="absolute right-6 top-6 text-right font-mono">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {time}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{date}</div>
    </div>
  );
}
