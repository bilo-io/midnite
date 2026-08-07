'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { MOBILE_MENU_EVENT, type MobileMenuEventDetail } from '@midnite/shell';
import { GradientGlow } from '@midnite/ui';

import { useChatCommand } from '@/hooks/use-chat-command';
import { useIsMobile } from '@/hooks/use-media-query';
import { useSeenGuides } from '@/lib/guide/use-seen-guides';
import { cn } from '@/lib/utils';

import { ReportIssueDialog } from '@/components/report-issue-dialog';

import { AssistantPanel, type AssistantView } from './assistant-panel';

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Mirror the CSS reduced-motion guard for `.animate-panel-*`: animations are off
 * only when the OS prefers reduced motion and the app hasn't forced them on
 * (`data-motion='full'`). When off, the panel must unmount immediately on close
 * rather than waiting for an exit animation that never plays.
 */
function panelAnimationsDisabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.getAttribute('data-motion') === 'full') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Exit animation duration (`.animate-panel-out` is 0.12s) plus a small buffer, so
// the shrink-out fully plays before the panel unmounts.
const EXIT_MS = 140;

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
  // `open` is the visual intent (drives enter vs. exit); `render` keeps the panel
  // in the DOM through the exit animation so it can shrink back into the FAB.
  const [open, setOpen] = useState(false);
  const [render, setRender] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // The mobile `More` sheet is up, so the FAB (fixed bottom-right, over the
  // sheet's lock row) gets out of its way.
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<AssistantView>('menu');
  const chat = useChatCommand();
  const isMobile = useIsMobile();
  const { hasAnyUnseen } = useSeenGuides();
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingId = useId();
  const t = useTranslations('assistant');

  // Subtle nudge: at least one product guide is unseen at its current version
  // (Phase 67 C — was scoped to the current route's guide). A dot until every
  // guide has been seen; never auto-opens. The "All guides" index is where they
  // get replayed.
  const showGuideNudge = !open && hasAnyUnseen;

  // Faded out, unclickable and out of the tab order while the mobile menu is up.
  // Scoped to mobile so a viewport that grows past `md` with the sheet's state
  // still open (the sheet itself is `md:hidden`) doesn't strand the FAB.
  const hidden = menuOpen && isMobile;

  useEffect(() => setMounted(true), []);

  const openPanel = useCallback(() => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setRender(true);
    setOpen(true);
  }, []);

  // Unmount the panel and reset it to the default view for next time.
  const finalizeClose = useCallback(() => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    setRender(false);
    setView('menu');
    chat.reset();
  }, [chat]);

  // Begin closing: flip to the exit animation, then unmount once it has played.
  // With animations off there's nothing to wait for, so unmount immediately.
  const close = useCallback(() => {
    setOpen(false);
    if (panelAnimationsDisabled()) {
      finalizeClose();
      return;
    }
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(finalizeClose, EXIT_MS);
  }, [finalizeClose]);

  // Clear any pending exit timer on unmount.
  useEffect(() => () => {
    if (exitTimer.current) clearTimeout(exitTimer.current);
  }, []);

  // Report issue (Phase 74): close the panel, then open the preview dialog. The
  // dialog owns its own portal + focus-trap; the FAB just holds the open flag.
  const openReport = useCallback(() => {
    close();
    setReportOpen(true);
  }, [close]);

  // Re-point the legacy chat-to-board event at the FAB (Phase 66 Theme D): with
  // chat relocated here, `midnite:open-chat` now opens the panel straight into
  // its chat view rather than the ⌘K palette.
  useEffect(() => {
    const onChat = () => {
      setView('chat');
      openPanel();
    };
    window.addEventListener('midnite:open-chat', onChat);
    return () => window.removeEventListener('midnite:open-chat', onChat);
  }, [openPanel]);

  // Step aside while the mobile nav's `More` sheet is open: the FAB sits exactly
  // over the sheet's theme/lock row. Driven by shell's event rather than a
  // z-index — the tab bar has to stay the topmost fixed layer
  // (bilo-io/midnite-app#5), so reordering the layers is not on the table. An
  // open panel closes too; the sheet is the surface the user just chose.
  useEffect(() => {
    const onMenu = (e: Event) => {
      setMenuOpen((e as CustomEvent<MobileMenuEventDetail>).detail?.open === true);
    };
    window.addEventListener(MOBILE_MENU_EVENT, onMenu);
    return () => window.removeEventListener(MOBILE_MENU_EVENT, onMenu);
  }, []);

  useEffect(() => {
    if (menuOpen && render) close();
  }, [menuOpen, render, close]);

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
        aria-hidden={hidden || undefined}
        className={cn(
          'fixed right-4 z-40 rounded-full',
          'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5',
          'transition-opacity duration-200 motion-reduce:transition-none',
          hidden && 'pointer-events-none opacity-0',
        )}
      >
        <button
          ref={fabRef}
          type="button"
          tabIndex={hidden ? -1 : undefined}
          data-tour="assistant"
          onClick={() => (open ? close() : openPanel())}
          aria-label={t('open')}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card text-foreground transition-transform hover:scale-105 motion-reduce:transition-none"
        >
          <Image
            src="/logo.PNG"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
          {showGuideNudge && (
            <span
              aria-hidden
              className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </button>
      </GradientGlow>

      {mounted &&
        render &&
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
            onReport={openReport}
            exiting={!open}
          />,
          document.body,
        )}

      {mounted &&
        reportOpen &&
        createPortal(
          <ReportIssueDialog onClose={() => setReportOpen(false)} />,
          document.body,
        )}
    </>
  );
}
