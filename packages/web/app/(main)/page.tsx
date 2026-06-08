'use client';

import { useEffect, useState } from 'react';
import { StatusPills } from '@/components/status-pills';

// Greeting depends on the viewer's local time, so resolve it on the client after
// mount to avoid a server/client hydration mismatch. Ranges run earliest→latest
// across the day; the minute is only needed to pin the noon greeting to 12:00.
function greetingForTime(hour: number, minute: number): string {
  if (hour >= 1 && hour < 5) return 'early bird? or night owl?'; // predawn (1–5am)
  if (hour === 5) return 'rising to the occasion?'; // dawn (5–6am)
  if (hour >= 6 && hour < 8) return 'good morning'; // early morning (6–8am)
  if (hour >= 8 && hour < 11) return 'vibing yet? its past morning'; // mid-morning (8–11am)
  if (hour === 11) return 'vibe some sessions before lunch'; // late morning (11–12)
  if (hour === 12 && minute === 0) return 'middle of the day! hello!'; // noon (exactly 12:00)
  if (hour >= 12 && hour < 15) return 'good afternoon'; // lunch / early afternoon (12–3pm)
  if (hour >= 15 && hour < 17) return 'final push for the day... you got this!'; // late afternoon (3–5pm)
  if (hour >= 17 && hour < 19) return 'good prevening'; // early evening (5–7pm)
  if (hour >= 19 && hour < 21) return 'good evening'; // evening (7–9pm)
  return 'howzit nightowl'; // night (9pm–1am)
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

const TITLE_PUNCT = '.';

export default function HomePage() {
  const [greeting, setGreeting] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [subgreeting, setSubgreeting] = useState<string | null>(null);
  const [typedSub, setTypedSub] = useState('');
  const [now, setNow] = useState<Date | null>(null);

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
    const full = `${greeting}${TITLE_PUNCT}`;
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

  const titleDone = greeting !== null && typed.length === `${greeting}${TITLE_PUNCT}`.length;

  // Once the title is done, type the subtitle out character by character.
  useEffect(() => {
    if (!titleDone || subgreeting === null) return;
    let index = 0;
    const typeTimer = setInterval(() => {
      index += 1;
      setTypedSub(subgreeting.slice(0, index));
      if (index >= subgreeting.length) clearInterval(typeTimer);
    }, 35);
    return () => clearInterval(typeTimer);
  }, [titleDone, subgreeting]);

  const subDone = subgreeting !== null && typedSub.length === subgreeting.length;

  return (
    <div className="bg-grid relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <Clock now={now} />

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
          subDone ? 'opacity-100' : 'pointer-events-none opacity-0'
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
