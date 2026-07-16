'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, sendSessionPrompt } from '@/lib/api';
import { cn } from '@/lib/utils';

export type ReplyBoxProps = {
  /** The live agent session (== task id) to write the reply to. */
  sessionId: string;
  /** Called after a reply is delivered (input cleared). The card's status flip is
   *  earned via the gateway's UserPromptSubmit hook + WS event, not by this call. */
  onSent?: () => void;
  /** Compact single-line variant for the board card popover (vs. detail surfaces). */
  compact?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Phase 69 D — reply to a waiting agent without opening its terminal. Sends the
 * text to the live session's PTY (`POST /sessions/:id/prompt`, Phase 69 C); the
 * status truth (`waiting → wip`) comes from the hook round-trip + the board WS
 * event, so this box never optimistically flips anything — it just delivers the
 * line, clears, and lets the card move on its own. Renders only where a wait is
 * *live* (`needs-input`); dead/needs-attention waits keep their resolve actions.
 */
export function ReplyBox({
  sessionId,
  onSent,
  compact = false,
  autoFocus = false,
  placeholder = 'Reply to the agent…',
  className,
}: ReplyBoxProps) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const canSend = trimmed.length > 0 && !pending;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    setPending(true);
    setError(null);
    try {
      await sendSessionPrompt(sessionId, trimmed);
      setText('');
      onSent?.();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 409
            ? 'No live session — this task needs resolve, not reply.'
            : err.message
          : 'Failed to send reply.',
      );
    } finally {
      setPending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={submit} className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={pending}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Reply to the agent"
          className={cn(compact && 'h-8 text-sm')}
        />
        <Button
          type="submit"
          size={compact ? 'sm' : 'default'}
          disabled={!canSend}
          aria-label="Send reply"
        >
          <Send aria-hidden className="h-4 w-4" />
          {!compact ? <span className="ml-1.5">Send</span> : null}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
