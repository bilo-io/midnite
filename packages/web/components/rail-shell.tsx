'use client';

import type { CSSProperties, ReactNode } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared cockpit layout: a center region flanked by two independently
 * collapsible rails, styled to match the workflow editor's panels —
 *
 *  1. the toggle buttons live in the *content layer* (floating over the top
 *     corners of the center), never inside the rail itself, and
 *  2. collapsing/expanding animates the rail's width so it slides in and out.
 *
 * On mobile the rails become header-toggled drawers (render `<RailHeaderToggle>`
 * in the page header and the center goes full-width) — the floating toggles are
 * desktop-only, where there's room for them.
 */

export type RailConfig = {
  /** Rail heading, also the accessible name of the toggle. */
  title: string;
  /** Optional icon rendered before the heading. */
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Desktop open width in px (default 288 = w-72). */
  width?: number;
  content: ReactNode;
};

const DEFAULT_WIDTH = 288;

export function RailShell({
  left,
  right,
  isMobile,
  children,
  className,
}: {
  left?: RailConfig;
  right?: RailConfig;
  isMobile: boolean;
  /** The center content. */
  children: ReactNode;
  className?: string;
}) {
  const hasRail = Boolean(left || right);
  return (
    <div className={cn('flex flex-col gap-5 lg:flex-row lg:items-start', className)}>
      {left ? <Rail side="left" isMobile={isMobile} {...left} /> : null}

      <div className="relative min-w-0 flex-1">
        {/* Toggles float in the content layer and glide with the rail as its
            width animates. Desktop-only — mobile toggles live in the header. */}
        {!isMobile && left ? (
          <RailFloatingToggle side="left" open={left.open} title={left.title} onToggle={left.onToggle} />
        ) : null}
        {!isMobile && right ? (
          <RailFloatingToggle side="right" open={right.open} title={right.title} onToggle={right.onToggle} />
        ) : null}

        {/* Reserve headroom on desktop so the floating toggles never overlap the
            center content. */}
        <div className={cn(hasRail && 'lg:pt-11')}>{children}</div>
      </div>

      {right ? <Rail side="right" isMobile={isMobile} {...right} /> : null}
    </div>
  );
}

function Rail({
  side,
  title,
  icon,
  open,
  width = DEFAULT_WIDTH,
  content,
  isMobile,
}: RailConfig & { side: 'left' | 'right'; isMobile: boolean }) {
  const header = (
    <div className="mb-3 flex items-center gap-1.5">
      {icon}
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );

  // Mobile: a drawer that only takes part in the layout when open.
  if (isMobile) {
    if (!open) return null;
    return (
      <aside aria-label={title} className="w-full rounded-lg border border-border/60 bg-card/40 p-4">
        {header}
        {content}
      </aside>
    );
  }

  // Desktop: always mounted, animating its width between `width` and 0 so it
  // slides. The inner panel keeps a fixed width and is clipped by the wrapper's
  // overflow-hidden, so it slides rather than reflowing as the width animates.
  return (
    <aside
      aria-label={title}
      aria-hidden={!open}
      className={cn(
        'hidden shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:block',
        side === 'left' ? 'lg:order-first' : 'lg:order-last',
      )}
      style={{ width: open ? width : 0 } as CSSProperties}
    >
      <div
        className={cn(
          'rounded-lg border border-border/60 bg-card/40 p-4 transition-opacity duration-200 motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{ width } as CSSProperties}
      >
        {header}
        {content}
      </div>
    </aside>
  );
}

/**
 * The floating, content-layer toggle pinned to a top corner of the center.
 * Exported so bespoke rail layouts (media, councils) can reuse the exact style
 * without adopting the full <RailShell>.
 */
export function RailFloatingToggle({
  side,
  open,
  title,
  onToggle,
}: {
  side: 'left' | 'right';
  open: boolean;
  title: string;
  onToggle: () => void;
}) {
  const Icon: LucideIcon =
    side === 'left'
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen;
  const label = `${open ? 'Collapse' : 'Expand'} ${title}`;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={open}
      title={label}
      className={cn(
        'absolute top-2 z-20 hidden h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-200 hover:bg-accent hover:text-foreground motion-reduce:transition-none lg:flex',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/** The mobile header toggle for a rail (rails become drawers on mobile). */
export function RailHeaderToggle({
  side,
  open,
  onClick,
}: {
  side: 'left' | 'right';
  open: boolean;
  onClick: () => void;
}) {
  const Icon: LucideIcon =
    side === 'left'
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Toggle ${side} panel`}
      className="flex h-8 w-8 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
