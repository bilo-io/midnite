'use client';

import { useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DESK_ITEM_CATALOG } from '@/lib/office/desk-items';
import { useOfficeStore } from '@/lib/office-store';

/**
 * Lets the player choose which items sit on their corner-office desk (Phase 9
 * F2/F4). Up to 3 items can be selected simultaneously; choices are persisted to
 * localStorage via the store. Escape/close returns to the room; Phaser's keyboard
 * is disabled while open.
 */
export function DeskItemPicker({ onClose }: { onClose: () => void }) {
  const deskItems = useOfficeStore((s) => s.deskItems);
  const setDeskItems = useOfficeStore((s) => s.setDeskItems);
  const MAX = 3;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  function toggle(id: string) {
    if (deskItems.includes(id)) {
      setDeskItems(deskItems.filter((i) => i !== id));
    } else if (deskItems.length < MAX) {
      setDeskItems([...deskItems, id]);
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customise Desk"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-sm flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <Pencil className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Customise Desk</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <p className="border-b border-border/60 px-4 py-2.5 text-[11px] text-muted-foreground">
          Choose up to {MAX} items for your desk. Changes save automatically.
        </p>

        <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {DESK_ITEM_CATALOG.map((item) => {
            const selected = deskItems.includes(item.id);
            const disabled = !selected && deskItems.length >= MAX;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  disabled={disabled}
                  aria-pressed={selected}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : disabled
                        ? 'cursor-not-allowed border-border/40 bg-background/20 opacity-50'
                        : 'border-border/60 bg-background/40 hover:border-border hover:bg-muted/50',
                  )}
                >
                  <span className="text-xl leading-none select-none" aria-hidden>{item.emoji}</span>
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {selected && (
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      On desk
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
