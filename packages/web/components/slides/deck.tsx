'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize, X } from 'lucide-react';
import type { Slide } from '@/lib/slides/markdown';
import { sliceHtml, visibleLen } from '@/lib/slides/html-type';
import { copyCodeFromButton } from '@/lib/slides/code-blocks';
import { cn } from '@/lib/utils';
import { DeckRail } from './deck-rail';
import './slides.css';

// Steps that are a fenced code block or a table reveal instantly — typing them
// out character-by-character reads as janky rather than deliberate.
const isBlockStep = (html: string) => /<pre|md-table-wrap/.test(html);

export function Deck({ slides }: { slides: Slide[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState(0);
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const [hintGone, setHintGone] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [typedChars, setTypedChars] = useState(0); // visible chars shown of the typing step
  const [stepDone, setStepDone] = useState(true); // whether the last-revealed step finished typing
  const [showHelp, setShowHelp] = useState(false);
  const showHelpRef = useRef(false);
  showHelpRef.current = showHelp;

  const instantRef = useRef(false); // set just before an index change to skip title typing
  const stepInstantRef = useRef(false); // ditto for the step typewriter
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedRef = useRef(false);
  const stepsRef = useRef<HTMLUListElement>(null);

  // A parsed deck always has at least one slide and `index` stays in range
  // (clamped by `go`), so the current slide is always defined.
  const slide = slides[index]!;

  // Lock page scroll while presenting.
  useEffect(() => {
    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Typewriter for the title, restarted whenever the slide changes.
  useEffect(() => {
    const full = slide?.title ?? '';
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (instantRef.current || reducedRef.current || !full) {
      setTyped(full);
      setTypingDone(true);
      instantRef.current = false;
      return;
    }

    setTyped('');
    setTypingDone(false);
    let i = 0;
    const perChar = Math.max(16, Math.min(42, Math.round(720 / full.length)));
    intervalRef.current = setInterval(() => {
      i += 1;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setTypingDone(true);
      }
    }, perChar);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index, slide?.title]);

  const completeTitle = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTyped(slide?.title ?? '');
    setTypingDone(true);
  }, [slide?.title]);

  // Typewriter for the last-revealed step, restarted whenever the reveal count
  // (or slide) changes. Long bullets batch several chars per tick so they stay
  // snappy regardless of length.
  useEffect(() => {
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    const j = reveal - 1;
    const html = j >= 0 ? slide?.steps[j] ?? '' : '';
    const len = visibleLen(html);

    if (j < 0) {
      setTypedChars(0);
      setStepDone(true);
      return;
    }
    if (stepInstantRef.current || reducedRef.current || isBlockStep(html) || len === 0) {
      setTypedChars(len);
      setStepDone(true);
      stepInstantRef.current = false;
      return;
    }

    setTypedChars(0);
    setStepDone(false);
    let i = 0;
    const charsPerTick = Math.max(1, Math.ceil(len / 70));
    stepIntervalRef.current = setInterval(() => {
      i = Math.min(len, i + charsPerTick);
      setTypedChars(i);
      if (i >= len) {
        if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
        stepIntervalRef.current = null;
        setStepDone(true);
      }
    }, 16);

    return () => {
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    };
  }, [index, reveal, slide]);

  const completeStep = useCallback(() => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
    const j = reveal - 1;
    setTypedChars(j >= 0 ? visibleLen(slide?.steps[j] ?? '') : 0);
    setStepDone(true);
  }, [reveal, slide]);

  const go = useCallback(
    (target: number, revealTarget: number, instant: boolean) => {
      if (target < 0 || target >= slides.length) return;
      instantRef.current = instant;
      stepInstantRef.current = instant;
      setReveal(revealTarget);
      setIndex(target);
    },
    [slides.length],
  );

  const next = useCallback(() => {
    if (!typingDone) {
      completeTitle();
      return;
    }
    if (!stepDone) {
      completeStep(); // first press snaps the typing bullet to full, like the title
      return;
    }
    const stepCount = slide?.steps?.length ?? 0;
    if (reveal < stepCount) {
      stepInstantRef.current = false; // the newly revealed bullet should type
      setReveal((r) => r + 1);
    } else if (index < slides.length - 1) go(index + 1, 0, false);
  }, [typingDone, completeTitle, stepDone, completeStep, slide, reveal, index, slides.length, go]);

  const prev = useCallback(() => {
    if (!typingDone) {
      completeTitle();
      return;
    }
    if (!stepDone) {
      completeStep();
      return;
    }
    if (reveal > 0) {
      stepInstantRef.current = true; // stepping back shows the prior bullet in full
      setReveal((r) => r - 1);
    } else if (index > 0) go(index - 1, slides[index - 1]!.steps.length, true);
  }, [typingDone, completeTitle, stepDone, completeStep, reveal, index, slides, go]);

  // Pagination click: main dot -> slide title only; sub-dot -> reveal up to that step.
  const jump = useCallback(
    (i: number, stepCount: number) => {
      if (i === index) {
        if (!typingDone) completeTitle();
        stepInstantRef.current = true; // direct navigation reveals in full, no retyping
        setReveal(Math.max(0, Math.min(stepCount, slide.steps.length)));
      } else {
        go(i, stepCount, stepCount > 0);
      }
    },
    [index, typingDone, completeTitle, slide, go],
  );

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const exit = useCallback(() => {
    router.push('/slides');
  }, [router]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While the help overlay is open, only `?`/Esc do anything.
      if (showHelpRef.current && e.key !== '?' && e.key !== 'Escape') return;
      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowHelp((s) => !s);
          break;
        case 'Escape':
          if (showHelpRef.current) {
            setShowHelp(false);
          } else if (!document.fullscreenElement) {
            // Esc exits fullscreen natively; only leave the deck when not in it.
            e.preventDefault();
            exit();
          }
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
        case 'Enter':
        case 'PageDown':
          e.preventDefault();
          setHintGone(true);
          next();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'Backspace':
        case 'PageUp':
          e.preventDefault();
          setHintGone(true);
          prev();
          break;
        case 'Home':
          e.preventDefault();
          setHintGone(true);
          go(0, 0, false);
          break;
        case 'End':
          e.preventDefault();
          setHintGone(true);
          go(slides.length - 1, slides[slides.length - 1]!.steps.length, true);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go, slides, toggleFullscreen, exit]);

  useEffect(() => {
    const t = setTimeout(() => setHintGone(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Keep the title pinned and "paginate-scroll" the steps so the freshly
  // revealed point stays in view; also track whether the region overflows
  // (drives the fade + scroll affordance).
  useEffect(() => {
    const c = stepsRef.current;
    if (!c) return;
    // Smooth when settling on a bullet; instant follow while it's typing so the
    // caret stays in view without stacking smooth-scroll animations per char.
    const behavior: ScrollBehavior = reducedRef.current || !stepDone ? 'auto' : 'smooth';
    if (reveal <= 0) {
      c.scrollTo({ top: 0, behavior });
    } else {
      const el = c.querySelector<HTMLElement>(`[data-step="${reveal - 1}"]`);
      el?.scrollIntoView({ behavior, block: 'nearest' });
    }
    // Only fade when content truly overflows past the reserved bottom padding,
    // so a slide that fits keeps its last point crisp.
    const padBottom = parseFloat(getComputedStyle(c).paddingBottom) || 0;
    setOverflowing(c.scrollHeight - c.clientHeight > padBottom + 2);
  }, [index, reveal, typed, typedChars, stepDone]);

  const onStageClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('a')) return; // let links do their thing
    if (t.closest('.deck-control')) return; // chrome buttons handle themselves
    const copyBtn = t.closest('.md-copy');
    if (copyBtn) {
      copyCodeFromButton(copyBtn as HTMLElement); // copy, don't advance
      return;
    }
    setHintGone(true);
    next();
  };

  const stepCount = slide.steps.length;
  const density = stepCount > 9 ? ' dense' : stepCount > 5 ? ' compact' : '';

  const controlClass =
    'deck-control grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card/70 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-foreground/20 hover:bg-accent hover:text-foreground';

  return (
    <div className="slides-scope deck">
      <DeckRail slides={slides} index={index} reveal={reveal} jump={jump} />

      {/* No back button — the close (X) control exits to /slides already. The
          controls offset by --titlebar-h so the desktop title bar (fixed,
          z-[60]) never occludes them. */}
      <div className="fixed right-[clamp(1.2rem,2.4vw,2rem)] top-[calc(var(--titlebar-h,0px)_+_clamp(1.2rem,2.4vw,2rem))] z-30 flex items-center gap-1.5">
        <button type="button" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen (F)" className={controlClass}>
          <Maximize className="h-4 w-4" />
        </button>
        <button type="button" onClick={exit} aria-label="Exit presentation" title="Exit (Esc)" className={controlClass}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <main className="stage" onClick={onStageClick}>
        <div className={`slide${slide.cover ? ' cover' : ''}`} key={index}>
          <div className="slide-inner">
            <h1 className="title">
              {typed}
              {!typingDone && <span className="caret" aria-hidden="true" />}
            </h1>
            <ul ref={stepsRef} className={`steps${density}${overflowing ? ' overflowing' : ''}`}>
              {slide.steps.map((html, j) => {
                const typing = j === reveal - 1 && !stepDone;
                const inner = typing
                  ? sliceHtml(html, typedChars) + '<span class="caret" aria-hidden="true"></span>'
                  : html;
                return (
                  <li
                    key={j}
                    data-step={j}
                    className={`step${j < reveal ? ' in' : ''}${typing ? ' typing' : ''}`}
                    dangerouslySetInnerHTML={{ __html: inner }}
                  />
                );
              })}
            </ul>
          </div>
        </div>
      </main>

      <div className={`hint${hintGone ? ' gone' : ''}`}>
        Press <kbd>&rarr;</kbd> / <kbd>Space</kbd> to advance &nbsp;&middot;&nbsp; <kbd>&larr;</kbd> to go back
        &nbsp;&middot;&nbsp; <kbd>F</kbd> fullscreen &nbsp;&middot;&nbsp; <kbd>?</kbd> shortcuts
      </div>

      <div className="deck-progress" aria-hidden="true">
        {index + 1} / {slides.length}
      </div>

      {showHelp && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-background/50 p-4 backdrop-blur-sm"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div
            className={cn(
              'deck-control w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-foreground">Keyboard shortcuts</h2>
            <dl className="mb-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
              <dt className="font-mono text-primary">&rarr; / Space / Enter</dt>
              <dd className="text-muted-foreground">Next step or slide</dd>
              <dt className="font-mono text-primary">&larr; / Backspace</dt>
              <dd className="text-muted-foreground">Previous step or slide</dd>
              <dt className="font-mono text-primary">Home / End</dt>
              <dd className="text-muted-foreground">First / last slide</dd>
              <dt className="font-mono text-primary">F</dt>
              <dd className="text-muted-foreground">Toggle fullscreen</dd>
              <dt className="font-mono text-primary">Esc</dt>
              <dd className="text-muted-foreground">Back to all decks</dd>
              <dt className="font-mono text-primary">?</dt>
              <dd className="text-muted-foreground">Toggle this help</dd>
            </dl>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
