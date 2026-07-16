'use client';

import { useEffect, useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import type { SessionSummary, SessionStatus, SessionTranscript } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { SessionTerminal } from '@/components/session-terminal';
import { SessionTranscriptBody } from '@/components/session-transcript-body';
import { getSessionTranscript } from '@/lib/api';

// A session with a live agent has a running terminal; a completed one only has a
// persisted transcript to replay. Mirrors sessions-view's `isActive`.
function isActive(status: SessionStatus): boolean {
  return status === 'running' || status === 'waiting';
}

type Props = {
  /** The linked session, or null when the task never started one. */
  session: SessionSummary | null;
  /** Whether the counterpart session is still being resolved. */
  loading?: boolean;
  onArchiveToggle?: () => void;
  onDelete?: () => void;
};

/**
 * The Session tab body of the unified work-item modal (Phase 70): a live terminal
 * for an active session, a replayed transcript for a completed one, or an empty
 * state when the task has yet to spawn a session. Owns its session-scoped
 * archive/delete actions; "Open page" lives on the modal's tab strip.
 */
export function SessionPane({ session, loading = false, onArchiveToggle, onDelete }: Props) {
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const live = !!session && isActive(session.status);

  // Non-live sessions have no terminal — replay their persisted transcript.
  useEffect(() => {
    if (!session || live) return;
    let cancelled = false;
    setTranscript(null);
    setError(null);
    setTranscriptLoading(true);
    getSessionTranscript(session.projectSlug, session.id)
      .then((t) => {
        if (!cancelled) setTranscript(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load transcript');
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, live]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-10 text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-5 py-10 text-center">
        <p className="text-sm font-medium">No session yet</p>
        <p className="text-xs text-muted-foreground">
          This task hasn’t started a session. Start it to spawn an agent.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(onArchiveToggle || (onDelete && session.archivedAt)) && (
        <div className="flex shrink-0 items-center justify-end gap-1.5 border-b border-border/60 px-5 py-2">
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
        </div>
      )}

      {live ? (
        <div className="min-h-0 flex-1 px-5 py-4">
          <SessionTerminal session={session} />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {transcriptLoading ? (
            <p className="text-sm text-muted-foreground">Loading transcript…</p>
          ) : error ? (
            <p className="text-sm text-destructive-foreground">{error}</p>
          ) : transcript ? (
            <SessionTranscriptBody transcript={transcript} />
          ) : null}
        </div>
      )}
    </div>
  );
}
