'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import type { Memory, MemoryChatMessage } from '@midnite/shared';
import { getMemoryChat, getSetupStatus, postMemoryChat } from '@/lib/api';
import { MarkdownPreview } from '@/components/markdown-preview';
import { SourceIcon } from '@/components/source-icon';
import { cn } from '@/lib/utils';

/**
 * Chat to the knowledge base (Phase 65 C). A grounded Q&A over the memory's doc +
 * its ingested sources: the thread persists server-side (one thread per memory),
 * answers cite the sources they drew on, and the composer disables itself with a
 * hint when no AI provider is configured. Delivery is plain request/response with
 * an optimistic pending bubble (Decision: no streaming this theme).
 */
export function MemoryChatComposer({ memory }: { memory: Memory }) {
  const [messages, setMessages] = useState<MemoryChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-[hsl(262_83%_66%)]" />
        Chat with this memory
      </div>

      {hasThread ? (
        <div
          role="log"
          aria-label="Chat with this memory"
          className="flex max-h-[46vh] flex-col gap-3 overflow-y-auto pr-1"
        >
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

      {disabled ? (
        <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          Add an AI provider in Settings to chat with this memory.
        </p>
      ) : (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={pending !== null}
            aria-label="Ask this memory a question"
            placeholder="Ask this memory anything…"
            className="h-9 flex-1 rounded-md border border-border/60 bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending !== null || input.trim().length === 0}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors enabled:hover:bg-accent/50 enabled:hover:text-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}

      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
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
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Sources</span>
          {cited.map((s) => {
            const label = s.title?.trim() || s.fileName?.trim() || s.url || 'Source';
            const chip = (
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px]">
                <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} url={s.url} className="h-3 w-3" />
                <span className="max-w-[12rem] truncate">{label}</span>
              </span>
            );
            return s.url ? (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="hover:opacity-80">
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
  return <div className="self-end whitespace-pre-wrap rounded-lg bg-primary/10 px-3 py-2 text-sm">{content}</div>;
}
