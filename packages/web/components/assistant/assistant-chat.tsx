'use client';

import { useState, type KeyboardEvent } from 'react';
import { CornerDownLeft } from 'lucide-react';

import type { ChatCommandState } from '@/hooks/use-chat-command';
import { ChatBar } from '@/components/chat-bar';
import { cn } from '@/lib/utils';

/**
 * Chat-to-board, relocated into the assistant panel (Phase 66 Theme D). Owns the
 * text input; delegates all command state to the shared {@link useChatCommand}
 * hook (one hook, two hosts — the palette's `>` mode is the other), so preview →
 * confirm → undo behave identically to Phase 59. Presentation reuses {@link ChatBar}.
 */
export function AssistantChat({ chat }: { chat: ChatCommandState }) {
  const [text, setText] = useState('');
  const { phase, busy } = chat;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'confirm') chat.confirm();
      else if (phase === 'idle' || phase === 'done' || phase === 'error') chat.submit(text.trim());
    } else if (e.key === 'Escape' && phase !== 'idle') {
      // Let the panel keep Escape for close only once the command state is clear.
      e.stopPropagation();
      chat.reset();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <input
          // Panel opens into chat on user action (FAB / palette event), so focusing the input is expected.
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={busy}
          placeholder="Tell the board what to do…"
          aria-label="Chat with the board"
          className={cn(
            'w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <ChatBar command={text} state={chat} />
    </div>
  );
}
