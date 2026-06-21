import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge class names with Tailwind-aware conflict resolution — later utilities
 * win over earlier conflicting ones (`cn('p-2', 'p-4') === 'p-4'`). This is the
 * styling primitive every `@midnite/ui` component composes on top of.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
