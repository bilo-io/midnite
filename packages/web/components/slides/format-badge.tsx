import type { DeckFormat } from '@midnite/shared';
import { cn } from '@/lib/utils';

const LABELS: Record<DeckFormat, string> = {
  md: 'MD',
  html: 'HTML',
  mixed: 'Mixed',
};

const STYLES: Record<DeckFormat, string> = {
  md: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  html: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  mixed: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
};

/** The deck-level md/html/mixed badge — reused on the card, table row, and editor. */
export function FormatBadge({ format, className }: { format: DeckFormat; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
        STYLES[format],
        className,
      )}
    >
      {LABELS[format]}
    </span>
  );
}
