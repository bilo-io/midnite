'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, ArrowUpRight, ListTodo, X } from 'lucide-react';
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
  /**
   * Hide the "Task" deep-link. Set when the modal is opened from a context that
   * must not navigate away (e.g. the office overlay, which stays on `/office`).
   */
  disableNavigation?: boolean;
};

export function SessionTerminalModal({
  session,
  onClose,
  onArchiveToggle,
  onDelete,
  disableNavigation = false,
}: Props) {
  const router = useRouter();

  // session.id === task.id; deep-link into the tasks board, which auto-opens it.
  const goToTask = () => {
    if (!session.linkedTaskId) return;
    onClose();
    router.push(`/tasks?open=${encodeURIComponent(session.linkedTaskId)}`);
  };

  // Open the full session cockpit (Phase 51 F). Shown even under
  // `disableNavigation` — it's the office's intended entry point *out* to the
  // detail page (that flag only hides the in-app task deep-link).
  const goToSessionPage = () => {
    onClose();
    router.push(`/sessions/view?id=${encodeURIComponent(session.id)}`);
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

  // Portal to <body>: this modal is rendered deep inside `.page-reveal`, whose
  // card-rise animation leaves a persisted `transform` on an ancestor. That
  // transform becomes the containing block for `position: fixed` (docking the
  // modal to the transformed box instead of the viewport) and a stacking context
  // (letting the page header paint over it). Portaling escapes both.
  if (typeof document === 'undefined') return null;

  return createPortal(
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
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Session
                </span>
                <span className="truncate font-mono">{session.projectDisplay}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" variant="secondary" size="sm" onClick={goToSessionPage}>
                <ArrowUpRight className="h-3.5 w-3.5" />
                Open page
              </Button>
              {session.linkedTaskId && !disableNavigation ? (
                <Button type="button" variant="secondary" size="sm" onClick={goToTask}>
                  <ListTodo className="h-3.5 w-3.5" />
                  Task
                </Button>
              ) : null}
              {onArchiveToggle ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onArchiveToggle}
                  aria-label={session.archivedAt ? 'Unarchive session' : 'Archive session'}
                  title={session.archivedAt ? 'Unarchive' : 'Archive'}
                  className="text-muted-foreground"
                >
                  {session.archivedAt ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                </Button>
              ) : null}
              {onDelete && session.archivedAt ? (
                <DeleteConfirmButton noun="session" onConfirm={onDelete} />
              ) : null}
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
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
    </>,
    document.body,
  );
}
