'use client';

import { forwardRef, type ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BookOpen, Compass, MessageSquare, Sparkles, X } from 'lucide-react';

import { GradientGlow } from '@midnite/ui';

import type { ChatCommandState } from '@/hooks/use-chat-command';
import { docsUrlForPathname } from '@/lib/docs-links';
import { cn } from '@/lib/utils';

import { AssistantChat } from './assistant-chat';

export type AssistantView = 'menu' | 'chat';

type EntryKey = 'docs' | 'guide' | 'chat' | 'agent';

type Entry = {
  key: EntryKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  /** Themes E (agent) + F (guide) land later — shown but not yet wired. */
  soon?: boolean;
};

const ENTRIES: readonly Entry[] = [
  { key: 'docs', label: 'Docs', description: "This page's documentation", icon: BookOpen },
  { key: 'guide', label: 'Guide', description: 'Tour this feature', icon: Compass, soon: true },
  { key: 'chat', label: 'Chat to board', description: 'Change the board in words', icon: MessageSquare },
  { key: 'agent', label: 'Agent', description: 'Ask about your fleet', icon: Sparkles, soon: true },
];

type Props = {
  view: AssistantView;
  onView: (view: AssistantView) => void;
  onClose: () => void;
  onKeyDownCapture?: React.KeyboardEventHandler<HTMLDivElement>;
  chat: ChatCommandState;
  isMobile: boolean;
  headingId: string;
};

/**
 * The assistant surface (Phase 66 Theme A): a glowing, gradient-bordered panel
 * with the four entries. `menu` lists them; picking "Chat to board" swaps to the
 * `chat` view (Theme D) with a back affordance. Docs opens the current route's
 * docs (Theme C). Guide + Agent are visible but disabled until Themes F + E land.
 * Rendered into a portal by {@link AssistantFab}; that host owns open state,
 * Escape / outside-click, and focus.
 */
export const AssistantPanel = forwardRef<HTMLDivElement, Props>(function AssistantPanel(
  { view, onView, onClose, onKeyDownCapture, chat, isMobile, headingId },
  ref,
) {
  const pathname = usePathname();

  const activate = (entry: Entry) => {
    if (entry.soon) return;
    if (entry.key === 'docs') {
      window.open(docsUrlForPathname(pathname), '_blank', 'noopener,noreferrer');
      onClose();
    } else if (entry.key === 'chat') {
      onView('chat');
    }
  };

  return (
    <GradientGlow
      trigger="always"
      className={cn(
        'fixed z-50 shadow-2xl',
        isMobile
          ? 'inset-x-2 bottom-2 rounded-2xl'
          : 'right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] w-[min(21rem,calc(100vw-2rem))] rounded-2xl md:bottom-20',
      )}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDownCapture={onKeyDownCapture}
        className="overflow-hidden rounded-2xl bg-card outline-none"
      >
        <header className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
          {view === 'chat' ? (
            <button
              type="button"
              onClick={() => onView('menu')}
              aria-label="Back to assistant menu"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          <h2 id={headingId} className="flex-1 text-sm font-semibold">
            {view === 'chat' ? 'Chat to board' : 'Assistant'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {view === 'menu' ? (
          <ul className="p-2">
            {ENTRIES.map((entry) => (
              <li key={entry.key}>
                <button
                  type="button"
                  onClick={() => activate(entry)}
                  disabled={entry.soon}
                  aria-disabled={entry.soon}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    entry.soon
                      ? 'cursor-not-allowed opacity-55'
                      : 'hover:bg-accent/60',
                  )}
                >
                  <entry.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{entry.label}</span>
                    <span className="block text-xs text-muted-foreground">{entry.description}</span>
                  </span>
                  {entry.soon && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <AssistantChat chat={chat} />
        )}
      </div>
    </GradientGlow>
  );
});
