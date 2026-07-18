'use client';

import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeaderIconButtonProps = {
  /** Accessible name + tooltip text. */
  label: string;
  open: boolean;
  onClick: () => void;
  /** Count for the corner badge; 0/undefined hides it. */
  count?: number;
  /** Tailwind colours for the badge (e.g. `bg-destructive text-destructive-foreground`). */
  badgeClassName?: string;
  ariaHaspopup?: 'menu' | 'dialog';
  /** The icon element. */
  children: ReactNode;
};

/**
 * A floating, icon-only header button with a hover/focus tooltip *below* it (the
 * cluster sits at the top of the viewport) and an optional corner count badge.
 * Text lives only in the tooltip + accessible name, per the header design.
 */
export const HeaderIconButton = forwardRef<HTMLButtonElement, HeaderIconButtonProps>(
  function HeaderIconButton(
    { label, open, onClick, count = 0, badgeClassName, ariaHaspopup = 'menu', children },
    ref,
  ) {
    const badge = count > 99 ? '99+' : String(count);
    return (
      <>
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          aria-label={count > 0 ? `${label}, ${count}` : label}
          aria-haspopup={ariaHaspopup}
          aria-expanded={open}
          className={cn(
            'relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
            open && 'bg-accent text-accent-foreground',
          )}
        >
          {children}
          {count > 0 ? (
            <span
              aria-hidden
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
                badgeClassName ?? 'bg-destructive text-destructive-foreground',
              )}
            >
              {badge}
            </span>
          ) : null}
        </button>
        {/* Tooltip below the button (header sits at the top of the screen). Hidden
            while the dropdown is open so it doesn't hover over the panel. */}
        {!open ? (
          <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            {label}
          </span>
        ) : null}
      </>
    );
  },
);
