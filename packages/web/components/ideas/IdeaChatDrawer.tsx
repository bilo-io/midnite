'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Send, Sparkles, X } from 'lucide-react';
import type { Idea } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { useIdeaMessages } from '@/hooks/use-idea-messages';
import { updateIdea } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  idea: Idea;
  open: boolean;
  onClose: () => void;
  /** Called after "Apply to idea" patches the body, so the detail page can refresh. */
  onApplied?: (updated: Idea) => void;
};

/**
 * Slide-over chat composer (Phase 42 Theme A). Left: the conversation thread;
 * right: a live preview of the assistant's latest refined body — the candidate
 * that "Apply to idea" writes back into `idea.body`, advancing draft → refined.
 * Send on ⌘/Ctrl+Enter. History restores from the server when the drawer opens.
 */
export function IdeaChatDrawer({ idea, open, onClose, onApplied }: Props) {
  const { messages, send, sending } = useIdeaMessages(idea.id);
  const [draft, setDraft] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // The most recent assistant message is the paste-ready refined body candidate.
  const latestAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant') ?? null,
    [messages],
  );
  const canApply = latestAssistant != null && latestAssistant.content !== idea.body;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keep the thread pinned to the newest message.
  useEffect(() => {
    if (open && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  if (!open) return null;

  const submit = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setDraft('');
    try {
      await send(content);
    } catch {
      // Restore the draft so the user can retry; the hook surfaces the error state.
      setDraft(content);
    }
  };

  const apply = async () => {
    if (!latestAssistant) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await updateIdea(idea.id, {
        body: latestAssistant.content,
        ...(idea.status === 'draft' ? { status: 'refined' as const } : {}),
      });
      onApplied?.(res.idea);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Refine idea: ${idea.title}`}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col',
          'border-l border-border bg-card shadow-2xl',
        )}
      >
        <header className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
            Refine “{idea.title}”
          </h2>
          <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Chat thread + composer */}
          <div className="flex min-h-0 flex-1 flex-col border-b border-border/60 md:border-b-0 md:border-r">
            <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Describe your idea and I’ll help shape it. Each reply is a refined version you
                  can apply to the idea.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      data-role={m.role}
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}
              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/60 p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder="Message… (⌘↵ to send)"
                  aria-label="Message"
                  rows={2}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={() => void submit()}
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Live refined-body preview */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-2.5">
              <h3 className="flex-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Refined body preview
              </h3>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void apply()}
                disabled={!canApply || applying}
              >
                <Check className="h-3.5 w-3.5" />
                {applying ? 'Applying…' : 'Apply to idea'}
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {applyError ? (
                <p className="mb-3 text-xs text-destructive">{applyError}</p>
              ) : null}
              {latestAssistant ? (
                <MarkdownPreview content={latestAssistant.content} />
              ) : idea.body ? (
                <MarkdownPreview content={idea.body} />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No refined body yet — send a message to generate one.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
