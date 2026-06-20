'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Phone } from 'lucide-react';
import type { SessionTranscript } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionTerminalModal } from '@/components/session-terminal-modal';
import { SessionTranscriptModal } from '@/components/session-transcript-modal';
import { getSessionTranscript } from '@/lib/api';
import { STATUS_CSS, STATUS_LABEL, type OfficeAgent } from '@/lib/office/agents';
import { useOfficeStore } from '@/lib/office-store';
import { BoardroomPanel } from './boardroom-panel';

/**
 * React overlay for the office: a controls hint, an online count, proximity
 * prompts, and the call/message interaction panel. All state comes from the
 * office store, which the live-data hook and the Phaser scene drive.
 */
export function OfficeHud() {
  const agents = useOfficeStore((s) => s.agents);
  const nearbyId = useOfficeStore((s) => s.nearbyId);
  const nearBoard = useOfficeStore((s) => s.nearBoard);
  const active = useOfficeStore((s) => s.active);
  const boardOpen = useOfficeStore((s) => s.boardOpen);
  const close = useOfficeStore((s) => s.close);
  const closeBoard = useOfficeStore((s) => s.closeBoard);

  const nearby = nearbyId ? agents.find((a) => a.id === nearbyId) : undefined;
  const activeAgent = active ? agents.find((a) => a.id === active.id) : undefined;
  const panelOpen = active !== null || boardOpen;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <Key>WASD</Key> / arrows or click to move · <Key>E</Key> to interact
      </div>

      <div className="absolute right-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        {agents.length} agent{agents.length === 1 ? '' : 's'} online
      </div>

      {panelOpen ? null : nearBoard ? (
        <Prompt>
          Press <Key>E</Key> to open the <span className="font-semibold">Board Room</span>
        </Prompt>
      ) : nearby ? (
        <Prompt>
          Press <Key>E</Key> to talk to <span className="font-semibold">{nearby.name}</span>
        </Prompt>
      ) : agents.length === 0 ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          No active agents — start a task to fill the office.
        </div>
      ) : null}

      {active && activeAgent ? <InteractionPanel agent={activeAgent} onClose={close} /> : null}

      {boardOpen ? <BoardroomPanel onClose={closeBoard} /> : null}
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

type PanelView = 'menu' | 'terminal' | 'transcript';

/**
 * Desk interaction: **Call** opens the agent's live session terminal (real-time,
 * while it's running/waiting); **Messages** opens its transcript (what it's been
 * up to). Both reuse the Sessions-page modals, so this is wired to the gateway —
 * no more mock. The transcript modal is portalled to <body> so a persisted
 * page-reveal transform / the stage's `overflow-hidden` can't clip it.
 */
function InteractionPanel({ agent, onClose }: { agent: OfficeAgent; onClose: () => void }) {
  const [view, setView] = useState<PanelView>('menu');
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const session = agent.session;
  const live = session.status === 'running' || session.status === 'waiting';

  // Own Escape so it closes the panel (Phaser's keyboard is disabled while open).
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

  const openTranscript = async () => {
    setView('transcript');
    setTranscript(null);
    setError(null);
    setLoading(true);
    try {
      setTranscript(await getSessionTranscript(session.projectSlug, session.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'terminal') return <SessionTerminalModal session={session} onClose={onClose} />;
  if (view === 'transcript' && typeof document !== 'undefined') {
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

  return (
    <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Interact with ${agent.name}`}
        className="animate-dialog-in relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold leading-snug">{agent.name}</h2>
            <p className="truncate text-xs text-muted-foreground">{agent.project}</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_CSS[agent.status] }} />
            {STATUS_LABEL[agent.status]}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{agent.activity}</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => setView('terminal')}
            disabled={!live}
            title={live ? 'Open the live session terminal' : 'Live terminal is available while the agent is running'}
          >
            <Phone className="h-4 w-4" /> Call
          </Button>
          <Button type="button" variant="secondary" onClick={() => void openTranscript()}>
            <MessageSquare className="h-4 w-4" /> Messages
          </Button>
        </div>

        {!live ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {agent.name} isn’t live right now — open <span className="font-medium">Messages</span> to see what they did.
          </p>
        ) : null}
      </div>
    </div>
  );
}
