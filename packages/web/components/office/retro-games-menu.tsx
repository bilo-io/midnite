'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** A retro game entry in the menu. */
type RetroGame = {
  id: string;
  title: string;
  year: number;
  genre: string;
  tagline: string;
};

const GAMES: RetroGame[] = [
  { id: 'pac-man', title: 'PAC-MAN', year: 1980, genre: 'Arcade', tagline: 'Waka waka waka.' },
  { id: 'tetris', title: 'TETRIS', year: 1984, genre: 'Puzzle', tagline: 'Lines. Forever.' },
  { id: 'space-invaders', title: 'SPACE INVADERS', year: 1978, genre: 'Shooter', tagline: 'They keep moving faster.' },
  { id: 'donkey-kong', title: 'DONKEY KONG', year: 1981, genre: 'Platform', tagline: 'Jump over the barrels.' },
  { id: 'pong', title: 'PONG', year: 1972, genre: 'Sports', tagline: 'The one that started it all.' },
  { id: 'frogger', title: 'FROGGER', year: 1981, genre: 'Arcade', tagline: 'Just cross the road.' },
  { id: 'galaga', title: 'GALAGA', year: 1981, genre: 'Shooter', tagline: 'Let them capture you first.' },
  { id: 'street-fighter-2', title: 'STREET FIGHTER II', year: 1991, genre: 'Fighting', tagline: 'Hadouken.' },
];

/**
 * Retro-games menu — opened when the player interacts with the PlayStation in
 * the communal gaming corner (Phase 9 E4). Placeholder only: selecting a game
 * shows a "coming soon" notice. The seam is `onGameSelect(id)` on the item
 * row — wire actual gameplay here in a later phase.
 *
 * Follows the LibraryModal pattern: backdrop-close, own Escape, keyboard frozen
 * in Phaser while open.
 */
export function RetroGamesMenu({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (selected !== null) {
          setSelected(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose, selected]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Retro Games"
        className="animate-dialog-in relative flex max-h-[88%] w-full max-w-sm flex-col rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
          <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="flex-1 text-sm font-semibold">Game Library</h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {selected !== null ? (
            <ComingSoon game={GAMES.find((g) => g.id === selected)!} onBack={() => setSelected(null)} />
          ) : (
            <ul className="space-y-1.5">
              {GAMES.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(game.id)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-muted/50"
                  >
                    <GameIcon genre={game.genre} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-wide">{game.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {game.year} · {game.genre}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100">
                      PLAY
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ComingSoon({ game, onBack }: { game: RetroGame; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <span className="text-4xl">🕹️</span>
      <div>
        <p className="text-base font-bold tracking-widest">{game.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{game.tagline}</p>
      </div>
      <p className="rounded-md border border-border/60 bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
        Coming soon — the arcade is under construction.
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onBack}>
        ← Back to games
      </Button>
    </div>
  );
}

const GENRE_ICONS: Record<string, string> = {
  Arcade: '🟡',
  Puzzle: '🧩',
  Shooter: '🚀',
  Platform: '🍄',
  Sports: '🏓',
  Fighting: '🥊',
};

function GameIcon({ genre }: { genre: string }) {
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-base',
      )}
      aria-hidden
    >
      {GENRE_ICONS[genre] ?? '🎮'}
    </span>
  );
}
