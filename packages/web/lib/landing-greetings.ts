/**
 * The landing page's time-of-day greeting and its rotating second line (Phase 82 Theme D,
 * dashboard round 2).
 *
 * Extracted out of `app/(main)/page.tsx` because both lists are now **registries with
 * catalog counterparts** and the key-audit test has to import them — and a Next App Router
 * page module should export nothing but its component.
 *
 * Both lists keep their English as the per-entry fallback, resolved by the page against
 * `dashboard.landing.greetings.<timeOfDay>` / `dashboard.landing.subgreetings.<index>`.
 * Per the slice's scope call these live under `landing.*` rather than sharing keys with the
 * in-app widgets: this is the first screen a visitor sees, and its voice is deliberately
 * tunable without touching dashboard chrome.
 */

export type TimeOfDay =
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

export type GreetingWindow = {
  startHour: number; // inclusive, in decimal hours (e.g. 12 + 1/60 === 12:01)
  endHour: number; // exclusive; an entry where endHour < startHour wraps past midnight
  timeOfDay: TimeOfDay;
  greeting: string;
};

// Windows run earliest→latest and are matched in order, so the instant-wide noon
// window wins over the afternoon range that surrounds it. Decimal hours let us pin
// minute-level boundaries (the noon window ends at 12:01), and the trailing night
// window wraps past midnight.
//
// The `greeting` string is the **English original**, kept here as the per-window fallback
// in the registry-seam style used across Phase 82: `timeOfDay` is already a slug, so the
// catalog key is simply `dashboard.landing.greetings.<timeOfDay>`.
export const GREETING_WINDOWS: readonly GreetingWindow[] = [
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
export function windowForTime(hour: number, minute: number): GreetingWindow {
  const t = hour + minute / 60;
  const match = GREETING_WINDOWS.find(({ startHour, endHour }) =>
    startHour <= endHour ? t >= startHour && t < endHour : t >= startHour || t < endHour,
  );
  return match ?? GREETING_WINDOWS[GREETING_WINDOWS.length - 1]!;
}

/**
 * The rotating second line. Indexed rather than slugged: it's a pool the page picks from
 * at random, so `dashboard.landing.subgreetings.<index>` mirrors the array position and
 * each entry below is that key's English fallback. The registry sweep walks
 * `0…SUBGREETINGS.length - 1` in both locales, so adding a phrase here fails CI until
 * both catalogs have it.
 */
export const SUBGREETINGS = [
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
