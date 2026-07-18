'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Open/close state for a header-anchored dropdown, with outside-click + Escape
 * dismissal wired up while open. Returns the root ref to spread on the dropdown's
 * wrapper (the element the outside-click test is scoped to).
 */
export function useHeaderDropdown(): {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  rootRef: RefObject<HTMLDivElement | null>;
} {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, toggle: () => setOpen(!open), rootRef };
}
