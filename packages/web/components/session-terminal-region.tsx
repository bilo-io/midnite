'use client';

import { History, Radio } from 'lucide-react';
import type { SessionDetail } from '@midnite/shared';
import { SessionTerminal } from '@/components/session-terminal';
import { SessionTranscriptBody } from '@/components/session-transcript-body';
import { getSessionTranscript } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

/**
 * The cockpit centerpiece (Phase 51 C) — the one real fork. A live session
 * (running / waiting / idle — still attachable) gets the full interactive
 * `SessionTerminal` (WS read/write, inline approvals, connection chrome). An
 * ended session (completed or archived — the in-memory ring buffer is gone) gets
 * a read-only transcript scrollback. A badge makes live-vs-ended unambiguous.
 */
export function SessionTerminalRegion({ session }: { session: SessionDetail }) {
  const ended = session.status === 'completed' || Boolean(session.archivedAt);

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border/60 bg-card/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
        {ended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <History className="h-3 w-3" /> ended · read-only
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: 'hsl(var(--status-wip) / 0.15)',
              color: 'hsl(var(--status-wip))',
            }}
          >
            <Radio className="h-3 w-3" /> live
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {ended ? <EndedTranscript session={session} /> : <SessionTerminal session={session} />}
      </div>
    </div>
  );
}

/** Read-only scrollback for an ended session (the ring buffer is gone). */
function EndedTranscript({ session }: { session: SessionDetail }) {
  const { data: transcript, loading, error } = useApiData(
    () => getSessionTranscript(session.projectSlug, session.id),
    [session.projectSlug, session.id],
  );

  return (
    <div className="h-full overflow-y-auto p-4">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading transcript…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : transcript ? (
        <SessionTranscriptBody transcript={transcript} />
      ) : (
        <p className="text-sm text-muted-foreground">No transcript available.</p>
      )}
    </div>
  );
}
