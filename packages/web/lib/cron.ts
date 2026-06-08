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
