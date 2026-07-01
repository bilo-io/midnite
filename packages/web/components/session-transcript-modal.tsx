'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, ArrowUpRight, X } from 'lucide-react';
import type { SessionSummary, SessionTranscript } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionStatusDot } from '@/components/session-card';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { SessionTranscriptBody } from '@/components/session-transcript-body';

type Props = {
  session: SessionSummary;
  transcript: SessionTranscript | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onArchiveToggle?: () => void;
  onDelete?: () => void;
};

export function SessionTranscriptModal({
  session,
  transcript,
  loading,
  error,
  onClose,
  onArchiveToggle,
  onDelete,
}: Props) {
  const router = useRouter();

  // Open the full session cockpit (Phase 51 F). session.id === task.id.
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
          aria-label={session.title}
          className="pointer-events-auto flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <SessionStatusDot status={transcript?.status ?? session.status} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">
                {transcript?.title ?? session.title}
              </h2>
              <p className="truncate text-xs text-muted-foreground">
                <span className="font-mono">{session.projectDisplay}</span>
                {transcript?.gitBranch ? (
                  <>
                    {' · '}
                    <span className="font-mono">{transcript.gitBranch}</span>
                  </>
                ) : null}
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={goToSessionPage} className="shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Open page
            </Button>
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
              <DeleteConfirmButton noun="session" onConfirm={onDelete} />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading transcript…</p>
            ) : error ? (
              <p className="text-sm text-destructive-foreground">{error}</p>
            ) : transcript ? (
              <SessionTranscriptBody transcript={transcript} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
