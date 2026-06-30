import { Cron } from 'croner';

// --- Recurrence presets (Phase 45 B) ---
// A friendly recurrence model that compiles to/from the constrained 5-field cron
// shapes the schedule-trigger UI offers. Anything outside these shapes is "Custom"
// (edited as a raw cron expression). `time` is "HH:MM" 24h; `day` is 0–6 (Sun–Sat);
// `dom` is 1–31. The cron itself is timezone-agnostic — the trigger's timezone is
// applied by croner at evaluation time.

export type RecurrencePreset =
  | { kind: 'daily'; time: string }
  | { kind: 'weekdays'; time: string }
  | { kind: 'weekly'; day: number; time: string }
  | { kind: 'monthly'; dom: number; time: string };

export type RecurrenceKind = RecurrencePreset['kind'];

export const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Parse an "HH:MM" string to {h,m}, clamped to valid ranges; defaults to 09:00. */
function parseTime(time: string): { h: number; m: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return { h: 9, m: 0 };
  return { h: Math.min(23, Number(m[1])), m: Math.min(59, Number(m[2])) };
}

/** Compile a recurrence preset to a 5-field cron expression. */
export function presetToCron(p: RecurrencePreset): string {
  const { h, m } = parseTime('time' in p ? p.time : '09:00');
  switch (p.kind) {
    case 'daily':
      return `${m} ${h} * * *`;
    case 'weekdays':
      return `${m} ${h} * * 1-5`;
    case 'weekly':
      return `${m} ${h} * * ${p.day}`;
    case 'monthly':
      return `${m} ${h} ${p.dom} * *`;
  }
}

/** Reverse-map a cron expression to a preset, or null if it isn't a recognised preset shape. */
export function cronToPreset(expr: string): RecurrencePreset | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom, mon, dow] = parts as [string, string, string, string, string];
  if (!/^\d{1,2}$/.test(min) || !/^\d{1,2}$/.test(hour)) return null;
  if (Number(min) > 59 || Number(hour) > 23) return null;
  if (mon !== '*') return null;
  const time = `${pad2(Number(hour))}:${pad2(Number(min))}`;

  if (dom === '*' && dow === '*') return { kind: 'daily', time };
  if (dom === '*' && dow === '1-5') return { kind: 'weekdays', time };
  if (dom === '*' && /^[0-6]$/.test(dow)) return { kind: 'weekly', day: Number(dow), time };
  if (dow === '*' && /^([1-9]|[12]\d|3[01])$/.test(dom)) return { kind: 'monthly', dom: Number(dom), time };
  return null;
}

/** The next `n` fire times for a cron in the given timezone; `[]` for an invalid expression. */
export function nextRuns(expr: string, timezone: string, n = 3): Date[] {
  try {
    const cron = new Cron(expr, { timezone: timezone || 'UTC' });
    const runs: Date[] = [];
    let prev: Date | null = null;
    for (let i = 0; i < n; i++) {
      const next: Date | null = cron.nextRun(prev ?? undefined);
      if (!next) break;
      runs.push(next);
      prev = next;
    }
    return runs;
  } catch {
    return [];
  }
}

// Small, dependency-free human-readable summary for the common cron shapes used in the
// schedule trigger UI. Falls back to echoing the expression for anything it doesn't
// recognise. A fuller cron builder is a follow-up.
export function describeCron(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;
  const [min, hour, dom, , dow] = parts as [string, string, string, string, string];

  if (min === '*' && hour === '*') return 'Every minute';
  if (hour === '*' && /^\*\/(\d+)$/.test(min)) {
    return `Every ${min.split('/')[1]} minutes`;
  }
  if (dom === '*' && dow === '*' && /^\d+$/.test(min) && hour === '*') {
    return `Every hour at minute ${min}`;
  }
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
    if (dom === '*' && dow === '*') return `Every day at ${time}`;
    if (dow === '1-5') return `Weekdays at ${time}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (/^\d$/.test(dow)) return `Every ${days[Number(dow)]} at ${time}`;
  }
  return expr;
}

const everyN = (field: string): number | null => {
  const m = /^\*\/(\d+)$/.exec(field);
  return m ? Number(m[1]) : null;
};

/**
 * Approximate seconds between fires for a 5-field cron, used to sort schedules from
 * most frequent (smallest) to least frequent. Returns `Infinity` for shapes it can't
 * read, so unrecognised expressions sort last.
 */
export function cronIntervalSeconds(expr: string): number {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return Infinity;
  const [min, hour, dom, mon, dow] = parts as [string, string, string, string, string];

  if (min === '*') return 60;
  const minStep = everyN(min);
  if (minStep && hour === '*') return minStep * 60;
  if (hour === '*') return 3600; // a specific minute, every hour
  const hourStep = everyN(hour);
  if (hourStep) return hourStep * 3600;

  // From here min + hour are concrete: a daily time-of-day, narrowed by day fields.
  if (dow !== '*') {
    if (/^\d$/.test(dow)) return 604800; // a single weekday → weekly
    return 86400 * 1.2; // a weekday range (e.g. 1-5) ≈ daily-ish
  }
  if (dom !== '*') {
    if (/^\d+$/.test(dom)) return 2592000; // a single day-of-month → monthly
    const domStep = everyN(dom);
    if (domStep) return domStep * 86400;
    return 2592000;
  }
  if (mon !== '*') return 2592000;
  return 86400; // daily
}

/** A short cadence label for a cron, e.g. "Every 5 minutes", "Every 6 hours", "Every day". */
export function describeFrequency(expr: string): string {
  const s = cronIntervalSeconds(expr);
  if (!Number.isFinite(s)) return 'Custom schedule';
  if (s < 3600) {
    const m = Math.round(s / 60);
    return m <= 1 ? 'Every minute' : `Every ${m} minutes`;
  }
  if (s < 86400) {
    const h = Math.round(s / 3600);
    return h <= 1 ? 'Every hour' : `Every ${h} hours`;
  }
  if (s < 604800) {
    const d = Math.round(s / 86400);
    return d <= 1 ? 'Every day' : `Every ${d} days`;
  }
  if (s < 2592000) {
    const w = Math.round(s / 604800);
    return w <= 1 ? 'Every week' : `Every ${w} weeks`;
  }
  const mo = Math.round(s / 2592000);
  return mo <= 1 ? 'Every month' : `Every ${mo} months`;
}
