'use client';

import { useEffect, useState } from 'react';
import { Ghost, Smile, Users } from 'lucide-react';
import type { PresenceScene } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { canLocate, locatePlayer } from '@/lib/presence-bridge';
import { saveGhost } from '@/lib/presence-identity';
import { presencePeerList, usePresenceStore } from '@/lib/presence-store';
import { useOfficeStore } from '@/lib/office-store';

/**
 * Phase 64 Theme E — the office social HUD: an emote wheel + a "teammates here"
 * roster, shared by both engines (mounted by each office view). Reads the presence
 * store; fires emotes via the `emote` action (from `useOfficePresence`) and
 * locate/walk-to via the scene bridge (2D only — the 3D rig is manual). Renders
 * nothing distracting when you're alone: the roster shows just you.
 */

const EMOTES = ['👋', '👍', '☕', '🎉', '❓', '👀'] as const;

const SCENE_LABEL: Record<PresenceScene, string> = {
  office: 'Office',
  corner: 'Corner office',
  arcade: 'Arcade',
};

function tintCss(tint: number | null): string {
  return tint == null ? 'hsl(var(--muted-foreground))' : `#${tint.toString(16).padStart(6, '0')}`;
}

export function PresenceHud({ emote }: { emote: (emoji: string) => void }) {
  const peers = usePresenceStore((s) => s.peers);
  const connected = usePresenceStore((s) => s.connected);
  const ghost = usePresenceStore((s) => s.ghost);
  const currentScene = useOfficeStore((s) => s.currentScene);
  const [wheelOpen, setWheelOpen] = useState(false);

  const list = presencePeerList(peers);

  // Quick-fire an emote with number keys 1..N (skip while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < EMOTES.length) emote(EMOTES[idx]!);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emote]);

  const fire = (emoji: string) => {
    emote(emoji);
    setWheelOpen(false);
  };

  const toggleGhost = () => {
    const next = !usePresenceStore.getState().ghost;
    usePresenceStore.getState().setGhost(next);
    saveGhost(next);
  };

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-30 flex flex-col gap-2">
      {/* Teammates roster */}
      <div className="pointer-events-auto w-52 rounded-lg border border-border/60 bg-background/80 p-2 text-[11px] backdrop-blur">
        <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="font-semibold">In the office · {list.length + 1}</span>
        </div>
        <ul className="space-y-0.5">
          <li className="flex items-center gap-2 rounded px-1 py-0.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: connected ? '#22c55e' : '#94a3b8' }} />
            <span className="flex-1 truncate font-medium text-foreground">You{ghost ? ' (ghost)' : ''}</span>
            <span className="text-muted-foreground">{SCENE_LABEL[currentScene]}</span>
          </li>
          {list.map((p) => {
            const sameScene = p.scene === currentScene;
            const locatable = canLocate() && sameScene;
            return (
              <li key={p.peerId} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/50">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tintCss(p.tint) }} />
                <button
                  type="button"
                  disabled={!locatable}
                  onClick={() => locatePlayer(p.x, p.y)}
                  title={locatable ? `Walk to ${p.name}` : undefined}
                  className={cn('flex-1 truncate text-left text-foreground', locatable && 'hover:underline')}
                >
                  {p.name}
                  {p.emote ? ` ${p.emote.emoji}` : ''}
                </button>
                <span className="text-muted-foreground">{SCENE_LABEL[p.scene]}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Emote wheel + ghost toggle */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Emote"
          onClick={() => setWheelOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground backdrop-blur transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Smile className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Ghost mode"
          aria-pressed={ghost}
          title={ghost ? 'Ghost mode on — nobody sees you' : 'Ghost mode off'}
          onClick={toggleGhost}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-colors',
            ghost
              ? 'border-violet-500/60 bg-violet-500/20 text-violet-600 dark:text-violet-300'
              : 'border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          <Ghost className="h-4 w-4" />
        </button>
        {wheelOpen && (
          <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background/90 px-2 py-1 shadow-lg backdrop-blur">
            {EMOTES.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Send ${e}`}
                onClick={() => fire(e)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-lg transition-transform hover:scale-125"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
