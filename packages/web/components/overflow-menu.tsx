'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OverflowMenuItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type Rect = { top: number; right: number };

/**
 * A generic "⋮" trigger that reveals a small action menu (Edit / Delete / …).
 * The dropdown renders in a portal with fixed positioning so it's never clipped
 * by an ancestor's overflow or trapped behind a stacking context (matches
 * {@link ExportMenu}'s placement approach) — needed here because accordion
 * headers (`SortableAccordions`) sit inside scrolling, `overflow-hidden` cards.
 */
export function OverflowMenu({
  items,
  ariaLabel = 'Open menu',
  className,
}: {
  items: OverflowMenuItem[];
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, place]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          'rounded p-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          className,
        )}
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: rect.top, right: rect.right }}
              className="z-[60] w-44 overflow-hidden rounded-lg border bg-popover p-1 shadow-lg"
            >
              {items.map(({ key, label, icon: Icon, onClick, destructive, disabled }) => (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpen(false);
                    onClick();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50',
                    destructive ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-accent',
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                  {label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
