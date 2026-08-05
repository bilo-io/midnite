'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { invalidateData } from '@/lib/data-refresh';
import { cn } from '@/lib/utils';

type Rect = { top: number; left: number };

/** Soft refresh — re-fetch every active query without dropping app state (open modals, terminal sessions, scroll position). */
function refresh() {
  invalidateData();
}

/** Hard reload — a full renderer reload, bypassing in-memory app state entirely. */
function hardReload() {
  window.location.reload();
}

/**
 * The title bar's reload button, next to the history back/forward buttons.
 * A left click does a soft {@link refresh}; a right click opens a small
 * context menu offering the same soft "Refresh" plus a "Hard Reload" — for
 * the rare case a stuck WS channel or stale client state needs a real reload
 * rather than a requery.
 */
export function ReloadButton({ className }: { className?: string }) {
  const t = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [spinning, setSpinning] = useState(false);
  // The spin-reset timer is tracked so unmount can cancel it. Left uncleared it
  // fired ~500ms after the component (or a test's environment) had gone away,
  // setting state on nothing — which surfaced as a post-teardown unhandled error
  // in CI once this directory entered the affected set.
  const spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback((x: number, y: number) => {
    setRect({ top: y, left: x });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const doRefresh = () => {
    refresh();
    setSpinning(true);
    if (spinTimer.current) clearTimeout(spinTimer.current);
    spinTimer.current = setTimeout(() => setSpinning(false), 500);
  };

  useEffect(
    () => () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
    },
    [],
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={doRefresh}
        onContextMenu={(e) => {
          e.preventDefault();
          place(e.clientX, e.clientY);
          setOpen(true);
        }}
        aria-label={t('reload')}
        title={t('reloadHint')}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          className,
        )}
      >
        <RefreshCw aria-hidden className={cn('h-4 w-4', spinning && 'animate-spin')} />
      </button>

      {open && rect
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={t('reload')}
              style={{ position: 'fixed', top: rect.top, left: rect.left }}
              className="z-[70] w-40 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  doRefresh();
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent/60"
              >
                {t('refresh')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  hardReload();
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-foreground hover:bg-accent/60"
              >
                {t('hardReload')}
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
