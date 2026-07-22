'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { useTypewriter } from '@/lib/use-typewriter';
import { introAtLeast, type AuthIntroStage } from '@/components/auth/use-auth-intro';
import { Wordmark } from '@/components/wordmark';
import { cn } from '@/lib/utils';

/**
 * Right two-thirds of the split-screen auth hero (desktop-only — the layout gates
 * it below `lg`). Text-only now: a 2×-size logo + wordmark over a cycling
 * marketing line, floating on the shared full-viewport neuro-cloud starfield the
 * layout paints behind everything. The title is *typed out* — the primary
 * gradient woven across the glyphs with a soft glow (`.auth-hero-title`, echoing
 * the screensaver) plus a blinking cursor — and once the title finishes typing
 * the subtitle fades in beneath it. A fresh line swaps in every 7–10s. Reduced
 * motion (Motion setting or OS) freezes on one line — full copy shown at once,
 * no typing, no cycle, no cursor blink.
 *
 * `intro` (see `useAuthIntro`) drives the once-per-session entry choreography:
 * once the starfield has faded in (layer owned by the layout), the logo fades in
 * at the hero's centre, a caret blinks beside it, the wordmark types out, then
 * the pair glides (FLIP-style — measured once, transform-only) to its resting
 * spot, at which point the title starts typing. Standalone mounts (stories/tests)
 * default to 'done': everything shown, no choreography.
 */

export type AuthHeroCopy = { title: string; subtitle: string };

/** Curated, offline copy set — reviewable, fast, no per-load LLM. */
export const AUTH_HERO_COPY: readonly AuthHeroCopy[] = [
  {
    title: 'Your fleet, one board.',
    subtitle: 'Spin up Claude Code agents, watch them work, ship in parallel.',
  },
  {
    title: 'Orchestrate the night shift.',
    subtitle: 'Queue the work, let the agents run, wake up to merged PRs.',
  },
  {
    title: 'A living graph of work.',
    subtitle: 'Tasks, agents and repos — connected, scheduled, always in motion.',
  },
  {
    title: 'Parallel by design.',
    subtitle: 'Every task its own agent, every agent its own worktree.',
  },
  {
    title: 'From backlog to merged.',
    subtitle: 'Dependency-aware scheduling drives each task to done, on its own.',
  },
  {
    title: 'Command your agents.',
    subtitle: 'One gateway, a fleet of sessions, a board that never sleeps.',
  },
  {
    title: 'Welcome back to midnite.',
    subtitle: 'Pick up the board where your agents left off.',
  },
] as const;

/** Pick one copy pair at random. Exposed so tests can assert the set membership. */
export function pickAuthHeroCopy(rnd: () => number = Math.random): AuthHeroCopy {
  return AUTH_HERO_COPY[Math.floor(rnd() * AUTH_HERO_COPY.length)]!;
}

/** Pick a pair that differs from `prev` (so a cycle never repeats the same line). */
function pickDifferentCopy(prev: AuthHeroCopy, rnd: () => number = Math.random): AuthHeroCopy {
  if (AUTH_HERO_COPY.length <= 1) return prev;
  let next = prev;
  while (next === prev) next = pickAuthHeroCopy(rnd);
  return next;
}

export function AuthHero({ intro = 'done' }: { intro?: AuthIntroStage }) {
  const { animate, typewriter } = useAnimationPrefs();
  // Chosen once per mount (client-only — the layout mounts this after hydration).
  const [copy, setCopy] = useState<AuthHeroCopy>(() => pickAuthHeroCopy());

  const heroRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  // FLIP offset: how far the brand block must translate from its resting spot to
  // sit dead-centre in the hero. Measured once on mount (the block never moves in
  // layout — only this transform does); null until measured / when unmeasurable.
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  // Whether the choreography actually ran (vs. skipped straight to 'done') —
  // skipped intros must not play the centre→rest glide.
  const playedRef = useRef(false);
  if (intro === 'logo' || intro === 'cursor' || intro === 'wordmark') playedRef.current = true;
  // The title's gradient cursor must not appear until the logo + wordmark have
  // *finished* gliding to their resting spot — flipped on the brand block's own
  // `transform` transitionend. A skipped / reduced-motion intro has no glide, so
  // 'done' satisfies it as a fallback (see `brandLanded` below).
  const [brandSettled, setBrandSettled] = useState(false);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const brand = brandRef.current;
    if (!hero || !brand) return;
    const h = hero.getBoundingClientRect();
    const b = brand.getBoundingClientRect();
    if (h.width === 0 || b.width === 0) return; // jsdom / hidden — stay put
    setOffset({
      x: h.left + h.width / 2 - (b.left + b.width / 2),
      y: h.top + h.height / 2 - (b.top + b.height / 2),
    });
  }, []);

  // The wordmark types out during the intro's 'wordmark' beat; past it (or when
  // the intro was skipped) it renders in full immediately.
  const { typed: typedWordmark } = useTypewriter(
    introAtLeast(intro, 'wordmark') ? 'midnite' : '',
    { duration: 600, enabled: typewriter && playedRef.current },
  );

  // Type the title out; the subtitle waits for `titleDone` before fading in.
  // The gradient caret + typing stay hidden until the brand block has *fully*
  // landed — its glide transitionend (or 'done' when the intro was skipped) —
  // so the cursor only shows once the logo + wordmark reach their resting spot.
  // Under reduced motion the hook returns the full string immediately (done=true).
  const brandLanded = brandSettled || introAtLeast(intro, 'done');
  const showCopy = brandLanded;
  // Drop the trailing full stop — the hero title reads as a headline, not a
  // sentence (the copy set keeps the periods so it stays grammatical as data).
  const titleText = copy.title.replace(/\.$/, '');
  const { typed: typedTitle, done: titleDone } = useTypewriter(showCopy ? titleText : '', {
    duration: 900,
    enabled: typewriter,
  });

  // Cycle to a fresh line on a randomized 7–10s cadence once the intro settles;
  // disabled under reduced motion (the hero then rests on its initial line).
  useEffect(() => {
    if (!animate || !introAtLeast(intro, 'done')) return undefined;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 7000 + Math.random() * 3000; // 7–10s
      timer = setTimeout(() => {
        setCopy((prev) => pickDifferentCopy(prev));
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [animate, intro]);

  // Centre the brand block while the intro plays its pre-glide beats; the
  // transform transition only exists from 'move' on (and only when the intro
  // actually played), so the block *appears* centred, then glides home once.
  const centered = playedRef.current && !introAtLeast(intro, 'move');
  const showCaret = introAtLeast(intro, 'cursor') && !introAtLeast(intro, 'move');

  return (
    <div
      ref={heroRef}
      // select-none: press-and-drag is a neuro-cloud gesture (gather/release) —
      // without it, dragging across the marketing copy selects text. The
      // starfield is a full-viewport layer owned by the layout; the hero is
      // just the text floating over it (transparent, no own background).
      className="relative flex h-full w-full select-none flex-col justify-center overflow-hidden px-14 xl:px-20"
    >
      <div className="relative z-10 max-w-xl">
        {/* Logo + wordmark, 2× the form's compact size, above the title. */}
        <div
          ref={brandRef}
          className={cn(
            'mb-10 flex items-center gap-4 transition-opacity duration-700',
            introAtLeast(intro, 'logo') ? 'opacity-100' : 'opacity-0',
          )}
          style={{
            transform:
              centered && offset
                ? `translate(${offset.x}px, ${offset.y}px) scale(1.25)`
                : undefined,
            transition:
              playedRef.current && introAtLeast(intro, 'move')
                ? 'transform 900ms cubic-bezier(0.22, 0.9, 0.3, 1)'
                : undefined,
          }}
          onTransitionEnd={(e) => {
            // Only the brand block's own transform glide counts — not its opacity
            // fade, and not any child transition bubbling up.
            if (e.target === e.currentTarget && e.propertyName === 'transform') {
              setBrandSettled(true);
            }
          }}
        >
          {/* Round pulsating gradient bloom sits behind the logo icon (::after on
              the wrapper — replaced <img> elements can't host pseudo-elements). */}
          <span className="auth-hero-logo-glow relative inline-flex rounded-full">
            <Image
              src="/logo.PNG"
              alt="midnite"
              width={72}
              height={72}
              priority
              className="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-border"
            />
          </span>
          {/* The full wordmark reserves the width (so the centring never shifts
              as glyphs land); the visible copy types out in an overlay. */}
          <span className="relative inline-block">
            <Wordmark className="invisible text-4xl" />
            <span className="absolute inset-y-0 left-0 flex items-center">
              {/* The glyphs render twice, stacked: a blurred brand-gradient copy
                  behind (the glow, hugging the letter strokes) and the crisp
                  foreground text on top. Both take the same typed string so the
                  glow tracks the glyphs as they land. */}
              <span className="relative inline-block">
                <span aria-hidden className="pointer-events-none absolute left-0 top-0">
                  <Wordmark text={typedWordmark} className="auth-hero-wordmark-glow text-4xl" />
                </span>
                <Wordmark text={typedWordmark} className="relative text-4xl text-foreground" />
              </span>
              {showCaret && (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-[1.1em] w-[0.08em] bg-foreground animate-[blink_0.7s_step-end_infinite] motion-reduce:animate-none"
                />
              )}
            </span>
          </span>
        </div>

        <div key={copy.title}>
          <div className="flex min-h-[2.5em] items-baseline">
            <h2 className="auth-hero-title text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              {typedTitle}
            </h2>
            {/* Rendered (not opacity-toggled) only once the brand has landed:
                the blink animation drives `opacity`, which would override any
                opacity class and show the caret from first paint. */}
            {showCopy && (
              <span
                aria-hidden
                className="auth-hero-caret ml-1.5 inline-block w-[0.12em] self-stretch text-transparent animate-[blink_1s_step-end_infinite] motion-reduce:animate-none"
              >
                |
              </span>
            )}
          </div>
          <p
            className={cn(
              'mt-8 min-h-[3em] text-lg leading-relaxed text-muted-foreground transition-opacity duration-700 ease-out',
              showCopy && titleDone ? 'opacity-100' : 'opacity-0',
            )}
          >
            {copy.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
