'use client';

import Link from 'next/link';
import type { MouseEventHandler, ReactNode } from 'react';

import { buttonVariants } from '@midnite/ui';

import { cn } from '@/lib/utils';

type HoverExpandButtonVariant = 'outline' | 'ghost' | 'secondary' | 'default' | 'destructive';

type HoverExpandButtonProps = {
  /** Always-visible leading icon (e.g. a lucide icon element). */
  icon: ReactNode;
  /** Label revealed on hover/focus; also the control's accessible name. */
  label: string;
  variant?: HoverExpandButtonVariant;
  /** When set, renders a Next.js `<Link>` instead of a `<button>`. */
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
  /** How wide the revealed label may grow (Tailwind max-w utility). */
  maxWidthClassName?: string;
  /** Extra classes for the root (e.g. a danger tint). */
  className?: string;
};

/**
 * A control-bar action that shows only its **icon** by default and, on hover or
 * keyboard focus, reveals its **label** while the control widens with an
 * ease-in-out transition. Reduced-motion users still get the reveal, just without
 * the animation. The label stays in the DOM (clipped, not removed) so the control
 * always keeps an accessible name. Renders a `<button>` (via `onClick`) or a Next
 * `<Link>` (via `href`).
 */
export function HoverExpandButton({
  icon,
  label,
  variant = 'outline',
  href,
  onClick,
  disabled,
  maxWidthClassName = 'group-hover:max-w-[10rem] group-focus-visible:max-w-[10rem]',
  className,
}: HoverExpandButtonProps) {
  // Collapsed = an icon-only square (px-2, no gap); the label grows to its right.
  const rootClass = cn(buttonVariants({ variant, size: 'sm' }), 'group h-8 gap-0 px-2', className);

  const content = (
    <>
      <span className="grid shrink-0 place-items-center">{icon}</span>
      <span
        className={cn(
          'max-w-0 overflow-hidden whitespace-nowrap opacity-0',
          'transition-all duration-200 ease-in-out motion-reduce:transition-none',
          'group-hover:ml-1.5 group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:opacity-100',
          maxWidthClassName,
        )}
      >
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={rootClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={rootClass}>
      {content}
    </button>
  );
}
