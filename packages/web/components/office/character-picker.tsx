'use client';

import { useEffect } from 'react';
import { UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CHARACTER_OPTIONS,
  PLAYER_TINTS,
  type OfficeCustomisation,
} from '@/lib/office/customisation';

/** Hex int (0xRRGGBB) → CSS colour for a swatch. */
function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

/**
 * Pick the player's character + tint (Phase 9 B1/F4). Opened from the office HUD;
 * changes apply live to the player sprite and persist to localStorage. Escape/close
 * returns to the room (Phaser's keyboard is disabled while open, like the library).
 */
export function CharacterPicker({
  value,
  onChange,
  onClose,
}: {
  value: OfficeCustomisation;
  onChange: (next: OfficeCustomisation) => void;
  onClose: () => void;
}) {
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

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customise your character"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-sm flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <UserRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Your character</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3">
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Style</legend>
            <div className="grid grid-cols-2 gap-1.5">
              {CHARACTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={value.character === opt.key}
                  onClick={() => onChange({ ...value, character: opt.key })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
                    value.character === opt.key
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:bg-muted/50',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {PLAYER_TINTS.map((tint, i) => {
                const active = value.tint === tint;
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={tint === null ? 'Theme default' : hex(tint)}
                    aria-pressed={active}
                    onClick={() => onChange({ ...value, tint })}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                      active ? 'border-primary' : 'border-border/60',
                    )}
                    style={{
                      background:
                        tint === null
                          ? 'linear-gradient(135deg, hsl(var(--muted)) 50%, hsl(var(--foreground)/.4) 50%)'
                          : hex(tint),
                    }}
                  />
                );
              })}
            </div>
          </fieldset>
        </div>
      </div>
    </div>
  );
}
