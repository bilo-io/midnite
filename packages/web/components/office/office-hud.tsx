'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STATUS_CSS, STATUS_LABEL, type OfficeAgent } from '@/lib/office/agents';
import { useOfficeStore, type InteractionMode } from '@/lib/office-store';

/**
 * React overlay for the office: a controls hint, an online count, a proximity
 * prompt, and the call/message interaction panel. All state comes from the office
 * store, which the live-data hook and the Phaser scene drive.
 */
export function OfficeHud() {
  const agents = useOfficeStore((s) => s.agents);
  const nearbyId = useOfficeStore((s) => s.nearbyId);
  const active = useOfficeStore((s) => s.active);
  const setMode = useOfficeStore((s) => s.setMode);
  const close = useOfficeStore((s) => s.close);

  const nearby = nearbyId ? agents.find((a) => a.id === nearbyId) : undefined;
  const activeAgent = active ? agents.find((a) => a.id === active.id) : undefined;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        <Key>WASD</Key> / arrows to move · <Key>E</Key> to interact
      </div>

      <div className="absolute right-3 top-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
        {agents.length} agent{agents.length === 1 ? '' : 's'} online
      </div>

      {agents.length === 0 ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
          No active agents — start a task to fill the office.
        </div>
      ) : nearby && !active ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-card/90 px-4 py-2 text-sm shadow-lg backdrop-blur">
          Press <Key>E</Key> to talk to <span className="font-semibold">{nearby.name}</span>
        </div>
      ) : null}

      {active && activeAgent ? (
        <InteractionPanel agent={activeAgent} mode={active.mode} onMode={setMode} onClose={close} />
      ) : null}
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

function InteractionPanel({
  agent,
  mode,
  onMode,
  onClose,
}: {
  agent: OfficeAgent;
  mode: InteractionMode;
  onMode: (mode: InteractionMode) => void;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === 'message') textareaRef.current?.focus();
  }, [mode]);

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

        {mode === 'menu' ? (
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button type="button" variant="default" onClick={() => onMode('call')}>
              <Phone className="h-4 w-4" /> Call
            </Button>
            <Button type="button" variant="secondary" onClick={() => onMode('message')}>
              <MessageSquare className="h-4 w-4" /> Message
            </Button>
          </div>
        ) : null}

        {mode === 'call' ? (
          <div className="mt-5 flex flex-col items-center gap-3 py-2">
            <span className="relative flex h-10 w-10 items-center justify-center">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40"
                style={{ backgroundColor: STATUS_CSS[agent.status] }}
              />
              <Phone className="relative h-5 w-5 text-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">Calling {agent.name}…</p>
            <Button type="button" variant="destructive" size="sm" onClick={onClose}>
              End call
            </Button>
          </div>
        ) : null}

        {mode === 'message' ? (
          <div className="mt-4 space-y-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder={`Message ${agent.name}…`}
              className="w-full resize-none rounded-md border border-input bg-background p-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" variant="default" size="sm" disabled={!message.trim()} onClick={onClose}>
                Send
              </Button>
            </div>
          </div>
        ) : null}

        <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          Mock interaction — not yet wired to the gateway.
        </p>
      </div>
    </div>
  );
}
