/**
 * Small, dependency-free formatting helpers shared across the operator-console
 * pages (Phase 73 Theme F). Pure functions — unit-tested in `format.test.ts`.
 */

/** Format a USD amount. Sub-cent values fall back to more precision so a tiny
 *  spend never renders as a bare `$0.00`. */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';
  if (amount > 0 && amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact token/large-integer formatting: 1_234 → "1.2k", 2_500_000 → "2.5M". */
export function formatCompact(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}

/** Plain integer with thousands separators. */
export function formatInt(n: number): string {
  return n.toLocaleString('en-US');
}

/** Human duration from milliseconds: 900 → "0.9s", 65_000 → "1m 5s", null → "—". */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return `${m}m ${rem}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Short, locale-aware date-time for an ISO string. Invalid/empty → "—". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Date-only variant of {@link formatDateTime}. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** An ISO timestamp N days before now — for default time-range windows. */
export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}
