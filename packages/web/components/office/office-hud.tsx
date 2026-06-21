'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SessionTranscript } from '@midnite/shared';
import { SessionTerminalModal } from '@/components/session-terminal-modal';
import { SessionTranscriptModal } from '@/components/session-transcript-modal';
import { getSessionTranscript } from '@/lib/api';
import { type OfficeAgent } from '@/lib/office/agents';
import { useOfficeStore } from '@/lib/office-store';
import { BoardroomPanel } from './boardroom-panel';
import { LibraryModal } from './library-modal';

/**
 * React overlay for the office: a controls hint, an online count, proximity
 * prompts, and the call/message interaction panel. All state comes from the
 * office store, which the live-data hook and the Phaser scene drive.
 */
export function OfficeHud() {
  const agents = useOfficeStore((s) => s.agents);
  const nearbyId = useOfficeStore((s) => s.nearbyId);
  const nearBoard = useOfficeStore((s) => s.nearBoard);
  const nearKitchen = useOfficeStore((s) => s.nearKitchen);
  const nearLibrary = useOfficeStore((s) => s.nearLibrary);
  const onBreak = useOfficeStore((s) => s.onBreak);
  const active = useOfficeStore((s) => s.active);
  const boardOpen = useOfficeStore((s) => s.boardOpen);
  const libraryOpen = useOfficeStore((s) => s.libraryOpen);
  const close = useOfficeStore((s) => s.close);
  const closeBoard = useOfficeStore((s) => s.closeBoard);
  const closeLibrary = useOfficeStore((s) => s.closeLibrary);

  const nearby = nearbyId ? agents.find((a) => a.id === nearbyId) : undefined;
  const activeAgent = active ? agents.find((a) => a.id === active.id) : undefined;
  const panelOpen = active !== null || boardOpen || libraryOpen;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <Key>WASD</Key> / arrows or click to move · <Key>E</Key> to interact
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-2">
        {onBreak ? (
          <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 backdrop-blur dark:text-amber-400">
            ☕ On a break
          </span>
        ) : null}
        <span className="rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
          {agents.length} agent{agents.length === 1 ? '' : 's'} online
        </span>
      </div>

      {panelOpen ? null : nearBoard ? (
        <Prompt>
          Press <Key>E</Key> to open the <span className="font-semibold">Board Room</span>
        </Prompt>
      ) : nearKitchen ? (
        <Prompt>
          Press <Key>E</Key> to{' '}
          <span className="font-semibold">{onBreak ? 'get back to work' : 'take a coffee break'}</span>
        </Prompt>
      ) : nearLibrary ? (
        <Prompt>
          Press <Key>E</Key> to browse the <span className="font-semibold">Library</span>
        </Prompt>
      ) : nearby ? (
        <Prompt>
          Press <Key>E</Key> to open <span className="font-semibold">{nearby.name}</span>’s session
        </Prompt>
      ) : agents.length === 0 ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          No active agents — start a task to fill the office.
        </div>
      ) : null}

      {active && activeAgent ? <InteractionPanel agent={activeAgent} onClose={close} /> : null}

      {boardOpen ? <BoardroomPanel onClose={closeBoard} /> : null}

      {libraryOpen ? <LibraryModal onClose={closeLibrary} /> : null}
    </div>
  );
}

function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
      {children}
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

/**
 * Approaching an agent opens its session directly — no call/message menu, since
 * an office occupant *is* an agent running a known task. A live agent
 * (running/waiting) opens its session **terminal**; otherwise we open the
 * **transcript** of what it did. Both reuse the Sessions-page modals (wired to
 * the gateway). `disableNavigation` hides the terminal's "Task" deep-link so the
 * modal stays over the office — clicking through never leaves `/office`. The
 * transcript modal is portalled to <body> so a persisted page-reveal transform /
 * the stage's `overflow-hidden` can't clip it.
 */
function InteractionPanel({ agent, onClose }: { agent: OfficeAgent; onClose: () => void }) {
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = agent.session;
  const live = session.status === 'running' || session.status === 'waiting';

  // Non-live agents have no live terminal — fetch their transcript on open.
  useEffect(() => {
    if (live) return;
    let cancelled = false;
    setTranscript(null);
    setError(null);
    setLoading(true);
    getSessionTranscript(session.projectSlug, session.id)
      .then((t) => {
        if (!cancelled) setTranscript(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load transcript');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [live, session.projectSlug, session.id]);

  if (live) return <SessionTerminalModal session={session} onClose={onClose} disableNavigation />;
  if (typeof document === 'undefined') return null;
  return createPortal(
    <SessionTranscriptModal
      session={session}
      transcript={transcript}
      loading={loading}
      error={error}
      onClose={onClose}
    />,
    document.body,
  );
}
