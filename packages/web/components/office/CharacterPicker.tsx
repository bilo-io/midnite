'use client';

import { cn } from '@/lib/utils';
import { useOfficeStore } from '@/lib/office-store';

/** Robot variant accent colors (matches ROBOT_VARIANTS in textures.ts). */
const ROBOT_ACCENTS = ['#34d399', '#f472b6', '#38bdf8', '#fb923c', '#a78bfa', '#2dd4bf'];
/** Robot variant names (A–F). */
const ROBOT_NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];

export function CharacterPicker({ onClose }: { onClose: () => void }) {
  const playerVariant = useOfficeStore((s) => s.playerVariant);
  const setPlayerVariant = useOfficeStore((s) => s.setPlayerVariant);

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

        <div className="grid grid-cols-4 gap-2 p-4">
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
      </div>
    </div>
  );
}
