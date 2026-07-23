'use client';

import { useState } from 'react';
import { MessageSquareReply, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ReplyBox } from '@/components/reply-box';

/**
 * Phase 69 D — the board card's collapsed-to-icon quick-reply. Rendered only on a
 * *live* wait (`waitReason === 'needs-input'`, i.e. a bound live session — dead
 * needs-attention waits keep their resolve actions instead). Collapsed by default
 * so cards stay compact; expands to a compact {@link ReplyBox} inline. Lives
 * *outside* the card's `<button>` (nesting interactives is invalid), so it sits as
 * a small action row beneath the card body.
 */
export function WaitingQuickReply({ sessionId }: { sessionId: string }) {
  const t = useTranslations('task');
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
      >
        <MessageSquareReply aria-hidden className="h-3 w-3" />
        {t('waiting.reply')}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 p-1.5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
          {t('waiting.replyToAgent')}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t('waiting.cancelReply')}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
        >
          <X aria-hidden className="h-3 w-3" />
        </button>
      </div>
      <ReplyBox sessionId={sessionId} compact autoFocus onSent={() => setOpen(false)} />
    </div>
  );
}
