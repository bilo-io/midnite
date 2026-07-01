'use client';

import type { SessionTranscript, TranscriptMessage } from '@midnite/shared';
import { cn } from '@/lib/utils';

/**
 * The read-only transcript scrollback — a session's persisted messages + tool
 * calls, with an expandable task-events log. Extracted from the transcript modal
 * (Phase 51 C) so both the modal and the session detail page's ended-terminal
 * view render an identical transcript.
 */
export function SessionTranscriptBody({ transcript }: { transcript: SessionTranscript }) {
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
      <div className="px-2 text-center text-[11px] italic text-muted-foreground">{msg.text}</div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm',
          isUser ? 'bg-primary/10 text-foreground ml-12' : 'bg-muted/60 text-foreground mr-12',
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
      <span className="px-1 text-[10px] text-muted-foreground">{time}</span>
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
