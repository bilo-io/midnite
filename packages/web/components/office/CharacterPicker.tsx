'use client';

import { cn } from '@/lib/utils';
import { useOfficeStore } from '@/lib/office-store';
import { PLAYER_TINTS } from '@/lib/office/customisation';

/** Robot variant accent colours — matches ROBOT_VARIANTS in textures.ts. */
const ROBOT_ACCENTS = ['#34d399', '#f472b6', '#38bdf8', '#fb923c', '#a78bfa', '#2dd4bf'];
/** Robot variant display names. */
const ROBOT_NAMES = ['Rod', 'Twin', 'Bulb', 'Dish', 'Sensor', 'Fins'];

const TINT_CSS = PLAYER_TINTS.map((t) => (t === null ? null : `#${t.toString(16).padStart(6, '0')}`));
const TINT_LABELS = ['Natural', 'Blue', 'Green', 'Pink', 'Amber', 'Violet', 'Red'];

export function CharacterPicker({ onClose }: { onClose: () => void }) {
  const playerVariant = useOfficeStore((s) => s.playerVariant);
  const setPlayerVariant = useOfficeStore((s) => s.setPlayerVariant);
  const playerTint = useOfficeStore((s) => s.playerTint);
  const setPlayerTint = useOfficeStore((s) => s.setPlayerTint);

  function pick(v: number) {
    setPlayerVariant(v);
    onClose();
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="pointer-events-auto w-80 rounded-xl border border-border bg-card/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Choose your avatar</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Character grid */}
        <div className="grid grid-cols-4 gap-2 p-4 pb-2">
          {/* Human option */}
          <button
            type="button"
            onClick={() => pick(-1)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-[10px] font-medium transition-all hover:bg-muted/50',
              playerVariant === -1
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground',
            )}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg"
              style={{ background: '#4299e1' }}
            >
              👤
            </span>
            Human
          </button>

          {/* Robot variants 0–5 */}
          {ROBOT_ACCENTS.map((color, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-[10px] font-medium transition-all hover:bg-muted/50',
                playerVariant === i
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground',
              )}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-base font-bold text-white"
                style={{ background: color }}
              >
                🤖
              </span>
              {ROBOT_NAMES[i]}
            </button>
          ))}
        </div>

        {/* Tint palette */}
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Colour tint
          </p>
          <div className="flex flex-wrap gap-2">
            {TINT_CSS.map((css, i) => (
              <button
                key={i}
                type="button"
                title={TINT_LABELS[i]}
                aria-label={TINT_LABELS[i]}
                onClick={() => setPlayerTint(PLAYER_TINTS[i] ?? null)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all hover:scale-110',
                  playerTint === (PLAYER_TINTS[i] ?? null)
                    ? 'border-primary shadow-sm'
                    : 'border-transparent',
                )}
                style={css ? { background: css } : { background: 'conic-gradient(#e2e8f0, #94a3b8, #e2e8f0)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
