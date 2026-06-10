'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, ListTodo, X } from 'lucide-react';
import type { SessionSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionStatusDot } from '@/components/session-card';
import { SessionTerminal } from '@/components/session-terminal';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';

type Props = {
  session: SessionSummary;
  onClose: () => void;
  onArchiveToggle?: () => void;
  onDelete?: () => void;
};

export function SessionTerminalModal({ session, onClose, onArchiveToggle, onDelete }: Props) {
  const router = useRouter();

  // session.id === task.id; deep-link into the tasks board, which auto-opens it.
  const goToTask = () => {
    if (!session.linkedTaskId) return;
    onClose();
    router.push(`/tasks?open=${encodeURIComponent(session.linkedTaskId)}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Hold the body hidden briefly, then fade it in — the terminal still mounts and
  // connects immediately underneath, so content is ready by the time it appears.
  const [bodyVisible, setBodyVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBodyVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

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
            {session.linkedTaskId ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={goToTask}
                className="shrink-0 text-muted-foreground"
              >
                <ListTodo className="h-3.5 w-3.5" /> Go to task
              </Button>
            ) : null}
            {onArchiveToggle ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onArchiveToggle}
                className="shrink-0 text-muted-foreground"
              >
                {session.archivedAt ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" /> Archive
                  </>
                )}
              </Button>
            ) : null}
            {onDelete && session.archivedAt ? (
              <DeleteConfirmButton onConfirm={onDelete} />
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div
            className={`min-h-0 flex-1 px-5 py-4 transition-opacity duration-500 motion-reduce:transition-none ${
              bodyVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <SessionTerminal session={session} />
          </div>
        </div>
      </div>
    </>
  );
}
