'use client';

import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { MarkdownPreview } from '@/components/markdown-preview';
import { useGuide } from '@/lib/guide/use-guide';
import { useSeenGuides } from '@/lib/guide/use-seen-guides';
import { cn } from '@/lib/utils';

/** Padding around the spotlit element, and gap between it and the step card (px). */
const HOLE_PAD = 8;
const CARD_GAP = 12;

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Phase 66 Theme F — the product-guide spotlight overlay. Reads the running guide
 * from {@link useGuide}, finds the current step's `data-tour` anchor, dims the
 * page with an SVG mask that knocks a hole around the anchor, and floats a step
 * card beside it. Keyboard-driven (←/→/Enter/Esc), reduced-motion aware, and
 * portaled to `document.body`. Mounted once in the `(main)` shell next to the
 * assistant FAB. A step whose anchor isn't on the page is skipped; the guide is
 * marked seen as soon as it starts.
 */
export function GuideOverlay() {
  const { active, stepIndex, unavailable, next, prev, stop } = useGuide();
  const { markSeen } = useSeenGuides();
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  const step = active?.steps[stepIndex] ?? null;
  const total = active?.steps.length ?? 0;
  const isLast = active ? stepIndex >= total - 1 : false;

  // Mark the guide seen as soon as it starts, so the FAB's "unseen" dot clears.
  useEffect(() => {
    if (active) markSeen(active);
  }, [active, markSeen]);

  // Locate the current step's anchor and track its position. A missing anchor
  // advances the tour rather than stranding it on an invisible step.
  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
    if (!el) {
      next();
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [step, next]);

  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      return undefined;
    }
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, measure]);

  // Focus the card on each step so the controls are immediately keyboard-reachable.
  useEffect(() => {
    if (step) cardRef.current?.focus();
  }, [step, stepIndex]);

  // Auto-dismiss the "no guide here" notice.
  useEffect(() => {
    if (!unavailable) return undefined;
    const t = setTimeout(stop, 2600);
    return () => clearTimeout(t);
  }, [unavailable, stop]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') stop();
    else if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  };

  if (!mounted) return null;

  if (unavailable) {
    return createPortal(
      <div
        role="status"
        className="fixed inset-x-0 bottom-24 z-[60] mx-auto w-fit max-w-[90vw] rounded-lg bg-card px-4 py-2 text-sm shadow-2xl ring-1 ring-border"
      >
        No guided tour for this page yet.
      </div>,
      document.body,
    );
  }

  if (!active || !step) return null;

  const hole = rect
    ? {
        x: Math.max(0, rect.left - HOLE_PAD),
        y: Math.max(0, rect.top - HOLE_PAD),
        w: rect.width + HOLE_PAD * 2,
        h: rect.height + HOLE_PAD * 2,
      }
    : null;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={onKeyDown}>
      {/* SVG dimming layer with a knockout hole around the anchor. Clicking the
          dim area ends the tour (the hole passes clicks through to the page). */}
      <svg className="h-full w-full" aria-hidden onClick={stop}>
        <defs>
          <mask id="guide-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="10" fill="black" />}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgb(0 0 0 / 0.6)"
          mask="url(#guide-spotlight-mask)"
        />
        {hole && (
          <rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="pointer-events-none"
          />
        )}
      </svg>

      <StepCard
        ref={cardRef}
        titleId={titleId}
        title={step.title}
        body={step.body}
        index={stepIndex}
        total={total}
        isLast={isLast}
        hole={hole}
        placement={step.placement ?? 'bottom'}
        onPrev={prev}
        onNext={next}
        onStop={stop}
      />
    </div>,
    document.body,
  );
}

type StepCardProps = {
  titleId: string;
  title: string;
  body: string;
  index: number;
  total: number;
  isLast: boolean;
  hole: { x: number; y: number; w: number; h: number } | null;
  placement: 'top' | 'bottom' | 'left' | 'right';
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
};

const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  { titleId, title, body, index, total, isLast, hole, placement, onPrev, onNext, onStop },
  ref,
) {
  // Position the card beside the hole; clamp into the viewport. With no hole
  // (anchor not yet measured, e.g. jsdom) fall back to a centered card.
  const style = cardPosition(hole, placement);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      style={style}
      className={cn(
        'absolute z-[61] w-[min(20rem,calc(100vw-2rem))] rounded-xl bg-card p-4 shadow-2xl outline-none ring-1 ring-border',
      )}
    >
      <h2 id={titleId} className="mb-1 text-sm font-semibold">
        {title}
      </h2>
      <div className="text-sm text-muted-foreground">
        <MarkdownPreview content={body} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStop}
            className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          {index > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="rounded-md border border-input px-2.5 py-1 text-xs font-medium hover:bg-accent/60"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
          >
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
});

/** Approximate card size, used to keep the whole card inside the viewport. */
const CARD_W = 320;
const CARD_H = 220;

/**
 * Compute the step card's absolute top-left from the hole + preferred side, then
 * clamp so the **entire** card stays on-screen (a tall/wide anchor must not push
 * the card — and its controls — off the viewport). No CSS transforms, so the
 * clamped coordinate is the real rendered box.
 */
function cardPosition(
  hole: { x: number; y: number; w: number; h: number } | null,
  placement: 'top' | 'bottom' | 'left' | 'right',
): React.CSSProperties {
  if (!hole || (hole.w === 0 && hole.h === 0)) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  let top: number;
  let left: number;
  switch (placement) {
    case 'top':
      top = hole.y - CARD_H - CARD_GAP;
      left = hole.x;
      break;
    case 'left':
      top = hole.y;
      left = hole.x - CARD_W - CARD_GAP;
      break;
    case 'right':
      top = hole.y;
      left = hole.x + hole.w + CARD_GAP;
      break;
    case 'bottom':
    default:
      top = hole.y + hole.h + CARD_GAP;
      left = hole.x;
      break;
  }
  // Clamp the whole box into the viewport (with an 8px margin).
  left = Math.min(Math.max(8, left), Math.max(8, vw - CARD_W - 8));
  top = Math.min(Math.max(8, top), Math.max(8, vh - CARD_H - 8));
  return { top, left };
}
