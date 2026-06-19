'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Shared view-transition name: the browser matches the docked and full-screen
// frames by this name and morphs position + size between them. globals.css tunes
// the timing under `::view-transition-group(composer-frame)`.
const FRAME_STYLE = { viewTransitionName: 'composer-frame' } as CSSProperties;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Run a state change inside a View Transition so the docked⇄full-screen move
 * morphs smoothly. Falls back to an instant change when the API is unavailable
 * or the user prefers reduced motion. `flushSync` forces React to commit the new
 * DOM before the browser captures the "after" snapshot.
 */
function withTransition(apply: () => void) {
  const doc = typeof document !== 'undefined' ? document : undefined;
  if (!doc?.startViewTransition || prefersReducedMotion()) {
    apply();
    return;
  }
  doc.startViewTransition(() => flushSync(apply));
}

/** Full-screen toggle state for a composer, with a morphing transition and Escape-to-dock. */
export function useComposerFullscreen() {
  const [full, setFull] = useState(false);
  const toggle = useCallback(() => withTransition(() => setFull((v) => !v)), []);
  const close = useCallback(() => withTransition(() => setFull(false)), []);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full, close]);
  return { full, toggle, close };
}

/** Maximise / restore control — sits in the composer surface's top-right corner. */
export function ComposerFullscreenToggle({
  full,
  onToggle,
  className,
}: {
  full: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const Icon = full ? Minimize2 : Maximize2;
  return (
    <button
      type="button"
      // Don't let the button steal focus from the prompt: a blur here collapses
      // the docked box and races the toggle. We drive focus explicitly on toggle.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      aria-label={full ? 'Dock input' : 'Expand input to full screen'}
      aria-pressed={full}
      title={full ? 'Dock input' : 'Full screen'}
      className={cn(
        'absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

/**
 * Renders a composer card in place when docked, or floats it centred over a
 * blurred modal backdrop when full-screen (matching the app's modal chrome). The
 * card carries a stable view-transition name so toggling between the two states
 * morphs the same element across the move rather than popping. `children` is the
 * composer's own card (gradient-border + surface).
 */
export function ComposerFullscreen({
  full,
  onClose,
  children,
}: {
  full: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  // The portal target (document.body) only exists on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The docked⇄full swap remounts the card (it moves into/out of the portal), so
  // focus is dropped. On maximise, restore it to the prompt — caret at the end so
  // the user can keep typing; on minimise, leave it unfocused. The initial mount
  // is skipped so the page doesn't grab focus on load.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const el = wrapperRef.current?.querySelector('textarea');
    if (!el) return;
    if (!full) {
      // Focus-then-blur so the prompt's focus handlers fire and settle on
      // "unfocused" (it collapses) — a bare blur() no-ops when minimising via
      // Escape, where the remounted element was never focused to begin with.
      el.focus();
      el.blur();
      return;
    }
    el.focus({ preventScroll: true });
    const end = el.value.length;
    try {
      el.setSelectionRange(end, end);
    } catch {
      // some input types disallow setSelectionRange — focus alone is enough
    }
  }, [full]);

  if (!full) {
    return (
      <div ref={wrapperRef} style={FRAME_STYLE}>
        {children}
      </div>
    );
  }
  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="composer-fullscreen-backdrop fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div ref={wrapperRef} className="pointer-events-auto w-full max-w-2xl" style={FRAME_STYLE}>
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
