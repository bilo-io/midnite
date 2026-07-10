'use client';

import { Send, Sparkles } from 'lucide-react';

/**
 * The center chat composer (Phase 65 A scaffold). Chat-to-the-knowledge-base
 * lands in Theme C; until then this renders the docked affordance, disabled,
 * so the workspace shows its full shape without promising a live feature.
 */
export function MemoryChatComposer() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-card/30 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-[hsl(262_83%_66%)]" />
        Chat with this memory
        <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
          Coming soon
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          disabled
          aria-label="Ask this memory a question"
          placeholder="Ask this memory anything…"
          className="h-9 flex-1 cursor-not-allowed rounded-md border border-border/60 bg-muted/30 px-3 text-sm text-muted-foreground placeholder:text-muted-foreground/70"
        />
        <button
          type="button"
          disabled
          aria-label="Send"
          className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-md border border-border/60 text-muted-foreground/60"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
