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
