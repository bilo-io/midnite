'use client';

import { useEffect } from 'react';
import { SHORTCUTS } from '@/lib/keyboard-shortcuts';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
};

const GROUPS = ['General', 'Navigation', 'Board'] as const;

/** Modal dialog showing all keyboard shortcuts grouped by section. Opened by `?`. */
export function KeyboardShortcutsHelp({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4 space-y-5">
          {GROUPS.map((group) => {
            const items = SHORTCUTS.filter((s) => s.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <div className="space-y-1">
                  {items.map((s) => (
                    <div key={s.keys.join('+')} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-foreground">{s.label}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {s.keys.map((k, i) => (
                          <span key={i}>
                            {i > 0 && (
                              <span className="mx-0.5 text-xs text-muted-foreground">then</span>
                            )}
                            <kbd
                              className={cn(
                                'inline-flex items-center rounded border border-border bg-muted',
                                'px-1.5 py-0.5 text-[11px] font-mono font-medium text-foreground',
                              )}
                            >
                              {k}
                            </kbd>
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border/60 px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Press Esc to close
          </button>
        </div>
      </div>
    </div>
  );
}
