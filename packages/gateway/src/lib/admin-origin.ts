/**
 * Parse `MIDNITE_ADMIN_ORIGIN` — a comma-separated list of browser origins the
 * admin console (Phase 73 E) is served from — into a deduped, trimmed array.
 *
 * The admin app is a static export on its OWN origin that reads the gateway
 * cross-origin with `credentials: 'include'` (the SSO cookie + `/admin/*`). CORS
 * with credentials can't reflect `*`, so each admin origin must be an explicit
 * allow-list entry. Blank/whitespace entries are dropped; unset/empty yields `[]`.
 */
export function parseAdminOrigins(value: string | undefined | null): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  for (const part of value.split(',')) {
    const origin = part.trim();
    if (origin) seen.add(origin);
  }
  return [...seen];
}

/**
 * Merge extra origins into an existing allow-list, preserving order and dropping
 * duplicates. Additive — the base list (and its order) is never reordered, new
 * origins are appended in first-seen order.
 */
export function mergeAllowedOrigins(base: string[], extra: string[]): string[] {
  const merged = [...base];
  for (const origin of extra) {
    if (!merged.includes(origin)) merged.push(origin);
  }
  return merged;
}
