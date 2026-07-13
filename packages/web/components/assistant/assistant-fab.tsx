'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

import { GradientGlow } from '@midnite/ui';

import { useChatCommand } from '@/hooks/use-chat-command';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { AssistantPanel, type AssistantView } from './assistant-panel';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The persistent assistant surface (Phase 66 Theme A): a logo-anchored floating
 * action button, fixed bottom-right, mounted on app routes only (rendered from
 * the `(main)` shell). Rest state is a quiet logo; hovering lights the gradient
 * glow (Theme B, `trigger="hover"`); clicking expands a glowing panel (Docs /
 * Guide / Chat to board / Agent). Coexists with ⌘K — the palette stays the
 * keyboard command surface; this is the pointer-driven, discoverable one.
 */
export function AssistantFab() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AssistantView>('menu');
  const chat = useChatCommand();
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => {
    setOpen(false);
    setView('menu');
    chat.reset();
  }, [chat]);

  // Re-point the legacy chat-to-board event at the FAB (Phase 66 Theme D): with
  // chat relocated here, `midnite:open-chat` now opens the panel straight into
  // its chat view rather than the ⌘K palette.
  useEffect(() => {
    const onChat = () => {
      setView('chat');
      setOpen(true);
    };
    window.addEventListener('midnite:open-chat', onChat);
    return () => window.removeEventListener('midnite:open-chat', onChat);
  }, []);

  // Escape + outside-click close (mirrors the web portaled-menu convention).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        fabRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !fabRef.current?.contains(target)) close();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, close]);

  // Move focus into the panel when it opens (or when swapping views).
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, view]);

  // Keep Tab within the panel while it's open (a lightweight focus trap).
  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || activeEl === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <GradientGlow
        trigger="hover"
        className={cn(
          'fixed right-4 z-40 rounded-full',
          'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5',
        )}
      >
        <button
          ref={fabRef}
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-label="Open assistant"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground transition-transform hover:scale-105 motion-reduce:transition-none"
        >
          <Image
            src="/logo.PNG"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
        </button>
      </GradientGlow>

      {mounted &&
        open &&
        createPortal(
          <AssistantPanel
            ref={panelRef}
            view={view}
            onView={setView}
            onClose={close}
            onKeyDownCapture={onPanelKeyDown}
            chat={chat}
            isMobile={isMobile}
            headingId={headingId}
          />,
          document.body,
        )}
    </>
  );
}
