'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { PRESENCE_CHAT_MAX_LENGTH } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { useOfficeStore } from '@/lib/office-store';

/**
 * Phase 64 Theme G — the proximity-chat composer. A small input opened by the
 * `T` key or the 💬 button; while it's focused the office store's `chatOpen` flag
 * freezes the scene keys (WASD/arrows/interact), matching the existing panel
 * keyboard-disable contract. Enter sends (then closes), Esc/blur closes. The text
 * is sent ephemerally via the `chat` action — never persisted.
 */
export function PresenceChatInput({ chat }: { chat: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const setChatOpen = useOfficeStore((s) => s.setChatOpen);

  const openInput = useCallback(() => setOpen(true), []);
  const closeInput = useCallback(() => {
    setOpen(false);
    setValue('');
  }, []);

  // Mirror open-state into the store (freezes scene input) + focus on open.
  useEffect(() => {
    setChatOpen(open);
    if (open) inputRef.current?.focus();
    return () => setChatOpen(false);
  }, [open, setChatOpen]);

  // `T` opens the composer — unless you're already typing somewhere or a
  // full-screen office panel is up (its own inputs / focus own the keyboard).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (e.key !== 't' && e.key !== 'T') return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const s = useOfficeStore.getState();
      if (s.active || s.boardOpen || s.libraryOpen || s.playstationOpen || s.deskPickerOpen || s.characterPickerOpen) return;
      e.preventDefault();
      openInput();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openInput]);

  const submit = () => {
    const text = value.trim();
    if (text) chat(text);
    closeInput();
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Chat"
        title="Say something (T)"
        aria-pressed={open}
        onClick={() => (open ? closeInput() : openInput())}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-colors',
          open
            ? 'border-sky-500/60 bg-sky-500/20 text-sky-600 dark:text-sky-300'
            : 'border-border/60 bg-background/80 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
      {open && (
        <input
          ref={inputRef}
          type="text"
          value={value}
          maxLength={PRESENCE_CHAT_MAX_LENGTH}
          placeholder="Say something…"
          aria-label="Chat message"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              closeInput();
            }
          }}
          onBlur={closeInput}
          className="h-8 w-52 rounded-full border border-border/60 bg-background/90 px-3 text-[12px] text-foreground shadow-lg outline-none backdrop-blur placeholder:text-muted-foreground focus:border-sky-500/60"
        />
      )}
    </div>
  );
}
