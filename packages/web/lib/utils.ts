import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Clamp `n` to the inclusive range [lo, hi]. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Compact "just now" / "3m ago" / "2h ago" / "5d ago" for an ISO string or epoch ms. */
export function relativeTime(input: string | number): string {
  const ms = typeof input === 'number' ? input : new Date(input).getTime();
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff)) return '';
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
