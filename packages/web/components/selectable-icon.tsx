'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** The resource's icon (e.g. Folder for projects, CirclePile for councils). */
  Icon: LucideIcon;
  selected: boolean;
  onToggle: (shiftKey: boolean) => void;
  className?: string;
};

/**
 * The leading icon for a selectable collection item. It shows the resource icon
 * at rest; hovering or focusing it swaps in a checkbox — the affordance that
 * signals bulk selection is possible. Once selected it stays a filled checkbox.
 * Clicking toggles selection (and stops propagation so it never opens the item).
 */
export function SelectableIcon({ Icon, selected, onToggle, className }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={selected ? 'Deselect' : 'Select'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e.shiftKey);
      }}
      className={cn(
        'group/sel relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground outline-none transition-colors',
        className,
      )}
    >
      {/* Resource icon — fades out on hover/focus or once selected. */}
      <Icon
        className={cn(
          'h-4 w-4 transition-opacity duration-150',
          selected ? 'opacity-0' : 'opacity-100 group-hover/sel:opacity-0 group-focus-visible/sel:opacity-0',
        )}
      />
      {/* Checkbox — fades in on hover/focus, solid once selected. */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-0 flex items-center justify-center rounded-[5px] border transition-all duration-150',
          selected
            ? 'border-primary bg-primary text-primary-foreground opacity-100'
            : 'border-border/80 bg-background/40 opacity-0 group-hover/sel:opacity-100 group-focus-visible/sel:opacity-100',
        )}
      >
        <Check className={cn('h-3 w-3 transition-transform', selected ? 'scale-100' : 'scale-0')} />
      </span>
    </button>
  );
}
