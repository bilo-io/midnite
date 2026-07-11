'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mic, MicOff, Send, Sparkles } from 'lucide-react';
import type { Memory, MemoryChatMessage } from '@midnite/shared';
import { getMemoryChat, getSetupStatus, postMemoryChat } from '@/lib/api';
import { MarkdownPreview } from '@/components/markdown-preview';
import { SourceIcon } from '@/components/source-icon';
import { Button } from '@/components/ui/button';
import {
  ComposerFullscreen,
  ComposerFullscreenToggle,
  useComposerFullscreen,
} from '@/components/composer-fullscreen';
import { useAutoResizeTextarea } from '@/lib/use-auto-resize-textarea';
import { useSpeechRecognition } from '@/lib/use-speech-recognition';
import { cn } from '@/lib/utils';

/**
 * Chat to the knowledge base (Phase 65 C). A grounded Q&A over the memory's doc +
 * its ingested sources: the thread persists server-side (one thread per memory),
 * answers cite the sources they drew on, and the composer disables itself with a
 * hint when no AI provider is configured. Delivery is plain request/response with
 * an optimistic pending bubble (Decision: no streaming this theme).
 *
 * The thread renders inline in the center column; the composer input is portaled
 * into a fixed bottom-center bar (dashboard-style) — centered and width-capped,
 * floating over the scrolling content.
 */
export function MemoryChatComposer({ memory }: { memory: Memory }) {
  const [messages, setMessages] = useState<MemoryChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition({
    onFinal: (transcript) => {
      setInput((prev) => (prev ? `${prev.trimEnd()} ${transcript.trim()}` : transcript.trim()));
    },
  });

  const { full, toggle, close } = useComposerFullscreen();

  // Compact when idle; opens up on focus and grows with content up to a cap.
  // Full-screen gives the box a roomy, modal-sized floor.
  const displayText = speech.listening && speech.interim ? `${input} ${speech.interim}` : input;
  const ta = useAutoResizeTextarea(
    displayText,
    full ? { collapsed: 360, expanded: 360, max: 520 } : { collapsed: 40, expanded: 64, max: 220 },
  );

  // The fixed composer bar portals to document.body so its `position: fixed`
  // resolves against the viewport (never trapped by a transformed ancestor) and
  // floats over the page rather than sitting in the center column's flow.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    getMemoryChat(memory.id)
      .then((m) => alive && setMessages(m))
      .catch(() => alive && setMessages([]));
    getSetupStatus()
      .then((s) => {
        if (!alive) return;
        // Chat needs a reachable model — a provider key or a working agent CLI.
        const reachable = s.items.some(
          (i) => (i.id === 'provider' || i.id === 'agent-cli') && i.state === 'ok',
        );
        setAiReady(reachable);
      })
      .catch(() => alive && setAiReady(true)); // status unknown → let the server decide
    return () => {
      alive = false;
    };
  }, [memory.id]);

  useEffect(() => {
    // Optional call — scrollIntoView is absent under jsdom (tests).
    threadEndRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages, pending]);

  const send = async () => {
    const question = input.trim();
    if (!question || pending) return;
    setInput('');
    setError(null);
    setPending(question);
    try {
      const { userMessage, assistantMessage } = await postMemoryChat(memory.id, question);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send');
      setInput(question); // let the user retry without retyping
    } finally {
      setPending(null);
    }
  };

  const disabled = aiReady === false;
  const hasThread = messages.length > 0 || pending !== null;

  // The composer input, floated over the bottom of the viewport, centered and
  // width-capped exactly like the dashboard composer. Content above scrolls
  // behind the theme fade.
  const composerBar = (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 transition-[padding] duration-200 md:[padding-left:var(--nav-offset)]">
      {/* Tall theme fade so the thread washes out behind the composer. */}
      <div className="bg-gradient-to-t from-background from-45% via-background/85 to-transparent pb-6 pt-20">
        <div className="container">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            {disabled ? (
              <p className="rounded-xl border border-border/60 bg-card px-4 py-3 text-xs text-muted-foreground shadow-sm">
                Add an AI provider in Settings to chat with this memory.
              </p>
            ) : (
              <ComposerFullscreen full={full} onClose={close}>
                <div className="gradient-border relative z-10 rounded-xl shadow-sm transition-shadow duration-700 ease-out focus-within:shadow-lg motion-reduce:transition-none">
                  {/* Opaque surface so the conic gradient reads as border + glow only. */}
                  <div className="relative rounded-xl bg-card p-3">
                    <ComposerFullscreenToggle full={full} onToggle={toggle} />
                    <textarea
                      ref={ta.ref}
                      aria-label="Ask this memory a question"
                      className="w-full resize-none overflow-y-auto bg-transparent pr-8 text-sm placeholder:text-muted-foreground transition-[height] duration-300 ease-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                      value={displayText}
                      disabled={pending !== null}
                      onFocus={ta.onFocus}
                      onBlur={ta.onBlur}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void send();
                      }}
                      placeholder="Ask this memory anything… · ⌘/Ctrl + ⏎"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {speech.supported ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={speech.listening ? 'Stop dictation' : 'Dictate question'}
                            aria-pressed={speech.listening}
                            disabled={pending !== null}
                            onClick={speech.listening ? speech.stop : speech.start}
                            className={cn('h-8 w-8', speech.listening && 'text-destructive')}
                          >
                            {speech.listening ? (
                              <MicOff className="h-4 w-4" />
                            ) : (
                              <Mic className="h-4 w-4" />
                            )}
                          </Button>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        aria-label="Send"
                        disabled={pending !== null || input.trim().length === 0}
                        onClick={() => void send()}
                      >
                        {pending !== null ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </ComposerFullscreen>
            )}
            {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-[hsl(262_83%_66%)]" />
          Chat with this memory
        </div>

        {hasThread ? (
          <div role="log" aria-label="Chat with this memory" className="flex flex-col gap-3">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} memory={memory} />
            ))}
            {pending !== null ? (
              <>
                <UserBubble content={pending} />
                <div className="flex items-center gap-2 self-start rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              </>
            ) : null}
            <div ref={threadEndRef} />
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Ask a question about this memory and its sources — answers cite what they draw on.
          </p>
        )}
      </div>

      {mounted ? createPortal(composerBar, document.body) : null}
    </>
  );
}

function ChatBubble({ message, memory }: { message: MemoryChatMessage; memory: Memory }) {
  if (message.role === 'user') return <UserBubble content={message.content} />;
  const cited = message.citations
    .map((id) => memory.sources.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  return (
    <div
      className={cn(
        'flex flex-col gap-2 self-start rounded-lg px-3 py-2 text-sm',
        message.error ? 'bg-destructive/10 text-destructive' : 'bg-muted/40',
      )}
    >
      {message.error ? (
        <span>{message.content}</span>
      ) : (
        <MarkdownPreview content={message.content} className="text-sm" />
      )}
      {cited.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Sources
          </span>
          {cited.map((s) => {
            const label = s.title?.trim() || s.fileName?.trim() || s.url || 'Source';
            const chip = (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px]">
                <SourceIcon
                  kind={s.kind}
                  faviconUrl={s.faviconUrl}
                  url={s.url}
                  className="h-3 w-3"
                />
                <span className="max-w-[12rem] truncate">{label}</span>
              </span>
            );
            return s.url ? (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-80"
              >
                {chip}
              </a>
            ) : (
              <span key={s.id}>{chip}</span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="self-end whitespace-pre-wrap rounded-lg bg-primary/10 px-3 py-2 text-sm">
      {content}
    </div>
  );
}
