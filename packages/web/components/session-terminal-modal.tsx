'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { SessionSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionStatusDot } from '@/components/session-card';
import { SessionTerminal } from '@/components/session-terminal';

type Props = {
  session: SessionSummary;
  onClose: () => void;
};

export function SessionTerminalModal({ session, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${session.title} terminal`}
          className="pointer-events-auto flex h-[80vh] max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <SessionStatusDot status={session.status} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">{session.title}</h2>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-mono">{session.projectDisplay}</span>
                {' · '}
                <span>live terminal</span>
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 px-5 py-4">
            <SessionTerminal session={session} />
          </div>
        </div>
      </div>
    </>
  );
}
