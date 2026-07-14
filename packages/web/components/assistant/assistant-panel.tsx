'use client';

import { forwardRef, type ComponentType } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Compass, MessageSquare, Sparkles, X } from 'lucide-react';

import { GradientGlow } from '@midnite/ui';

import type { ChatCommandState } from '@/hooks/use-chat-command';
import { docsUrlForPathname } from '@/lib/docs-links';
import { ALL_GUIDES, guideLaunchPath, resolveGuide, type Guide } from '@/lib/guide/steps';
import { useGuide } from '@/lib/guide/use-guide';
import { useSeenGuides } from '@/lib/guide/use-seen-guides';
import { cn } from '@/lib/utils';

import { AssistantChat } from './assistant-chat';

export type AssistantView = 'menu' | 'chat' | 'guides';

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
  { key: 'guide', label: 'Guides', description: 'Tour this page — or browse them all', icon: Compass },
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
  const router = useRouter();
  const { hasSeen } = useSeenGuides();

  const activate = (entry: Entry) => {
    if (entry.soon) return;
    if (entry.key === 'docs') {
      window.open(docsUrlForPathname(pathname), '_blank', 'noopener,noreferrer');
      onClose();
    } else if (entry.key === 'chat') {
      onView('chat');
    } else if (entry.key === 'guide') {
      // Open the "All guides" index (Theme C): browse + replay any guide, with
      // the current route's tour emphasised at the top.
      onView('guides');
    }
  };

  // Replay a guide from the index: start immediately if we're already on its
  // route, else navigate there and let the shell watcher start it once its
  // anchors mount (`useGuide.pending`). `getState()` avoids subscribing here.
  const replay = (guide: Guide) => {
    const onRoute = !!pathname && resolveGuide(pathname)?.id === guide.id;
    if (onRoute) {
      useGuide.getState().start(guide);
    } else {
      const path = guideLaunchPath(guide);
      if (!path) {
        useGuide.getState().start(guide);
        onClose();
        return;
      }
      useGuide.getState().requestReplay(guide);
      router.push(path);
    }
    onClose();
  };

  // The current route's guide floats to the top of the index.
  const currentGuide = pathname ? resolveGuide(pathname) : null;
  const orderedGuides = [...ALL_GUIDES].sort((a, b) =>
    a.id === currentGuide?.id ? -1 : b.id === currentGuide?.id ? 1 : 0,
  );

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
          {view !== 'menu' ? (
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
            {view === 'chat' ? 'Chat to board' : view === 'guides' ? 'Guides' : 'Assistant'}
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
        ) : view === 'guides' ? (
          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
            {orderedGuides.map((guide) => {
              const seen = hasSeen(guide);
              const isCurrent = guide.id === currentGuide?.id;
              return (
                <li key={guide.id}>
                  <button
                    type="button"
                    onClick={() => replay(guide)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent/60"
                  >
                    <Compass className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{guide.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {isCurrent
                          ? 'This page'
                          : `${guide.steps.length} step${guide.steps.length === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    {!seen && (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-primary"
                        aria-label="Not seen yet"
                        title="Not seen yet"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <AssistantChat chat={chat} />
        )}
      </div>
    </GradientGlow>
  );
});
