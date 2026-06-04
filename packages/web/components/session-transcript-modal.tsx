'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type {
  SessionSummary,
  SessionTranscript,
  TranscriptMessage,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SessionStatusDot } from '@/components/session-card';

type Props = {
  session: SessionSummary;
  transcript: SessionTranscript | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function SessionTranscriptModal({
  session,
  transcript,
  loading,
  error,
  onClose,
}: Props) {
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
              <TranscriptBody transcript={transcript} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function TranscriptBody({ transcript }: { transcript: SessionTranscript }) {
  if (transcript.messages.length === 0) {
    return <p className="text-sm text-muted-foreground">No messages in this session.</p>;
  }
  return (
    <div className="space-y-3">
      {transcript.messages.map((msg) => (
        <Message key={msg.uuid} msg={msg} />
      ))}
      {transcript.taskEvents && transcript.taskEvents.length > 0 ? (
        <details className="mt-6 rounded-lg border border-border/60 bg-background/40 p-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Task events ({transcript.taskEvents.length})
          </summary>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
            {transcript.taskEvents.map((ev, idx) => (
              <li key={idx}>
                <span className="text-foreground/70">{ev.at}</span> · {ev.kind}
                {ev.data ? ` · ${JSON.stringify(ev.data)}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function Message({ msg }: { msg: TranscriptMessage }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const time = formatTime(msg.timestamp);

  if (isSystem) {
    return (
      <div className="px-2 text-center text-[11px] italic text-muted-foreground">
        {msg.text}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-primary/10 text-foreground ml-12'
            : 'bg-muted/60 text-foreground mr-12',
        )}
      >
        {msg.text || <span className="text-muted-foreground italic">(no text)</span>}
      </div>
      {msg.toolCalls && msg.toolCalls.length > 0 ? (
        <div className="mr-12 space-y-0.5 font-mono text-[11px] text-muted-foreground">
          {msg.toolCalls.map((tc, idx) => (
            <div key={idx}>
              <span className="text-foreground/70">→ {tc.name}</span>: {tc.summary}
            </div>
          ))}
        </div>
      ) : null}
      <span className="px-1 text-[10px] text-muted-foreground/60">{time}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '';
  }
}
