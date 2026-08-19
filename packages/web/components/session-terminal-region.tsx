'use client';

import { useTranslations } from 'next-intl';
import { History } from 'lucide-react';
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
  const t = useTranslations('sessions');
  const ended = session.status === 'completed' || Boolean(session.archivedAt);

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-lg border border-border/60 bg-card/30 lg:h-[calc(100vh-12.75rem)]">
      {/* No title bar for a live session: the terminal's own header already names
          the agent and carries the (single, pulsing) live indicator — a second
          "Terminal · live" strip above it just said the same thing twice. An
          ended session has no such header, so it keeps a slim badge row. */}
      {ended ? (
        <div className="flex items-center justify-end border-b border-border/60 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <History className="h-3 w-3" /> {t('terminal.endedBadge')}
          </span>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 p-3">
        {ended ? <EndedTranscript session={session} /> : <SessionTerminal session={session} />}
      </div>
    </div>
  );
}

/** Read-only scrollback for an ended session (the ring buffer is gone). */
function EndedTranscript({ session }: { session: SessionDetail }) {
  const t = useTranslations('sessions');
  const { data: transcript, loading, error } = useApiData(
    () => getSessionTranscript(session.projectSlug, session.id),
    [session.projectSlug, session.id],
  );

  return (
    <div className="h-full overflow-y-auto">
      {loading ? (
        <p className="text-sm text-muted-foreground">{t('terminal.loadingTranscript')}</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : transcript ? (
        <SessionTranscriptBody transcript={transcript} />
      ) : (
        <p className="text-sm text-muted-foreground">{t('terminal.noTranscript')}</p>
      )}
    </div>
  );
}
