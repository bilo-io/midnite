'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { useTypewriter } from '@/lib/use-typewriter';
import { ConstellationBackground } from '@/components/auth/constellation-background';
import { Wordmark } from '@/components/wordmark';
import { cn } from '@/lib/utils';

/**
 * Right two-thirds of the split-screen auth hero (desktop-only — the layout gates
 * it below `lg`). A theme-aware panel with the living knowledge-graph starfield
 * behind a 2×-size logo + wordmark and a cycling marketing line: the title is
 * *typed out* — the primary gradient woven across the glyphs with a soft glow
 * (`.auth-hero-title`, echoing the screensaver) plus a blinking cursor — and once
 * the title finishes typing the subtitle fades in beneath it. A fresh line swaps
 * in every 7–10s. Reduced motion (Motion setting or OS) freezes on one line —
 * full copy shown at once, no typing, no cycle, no cursor blink — and the
 * starfield paints a static frame.
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

export function AuthHero() {
  const { animate, typewriter } = useAnimationPrefs();
  // Chosen once per mount (client-only — the layout mounts this after hydration).
  const [copy, setCopy] = useState<AuthHeroCopy>(() => pickAuthHeroCopy());

  // Type the title out; the subtitle waits for `titleDone` before fading in.
  // Under reduced motion the hook returns the full string immediately (done=true).
  const { typed: typedTitle, done: titleDone } = useTypewriter(copy.title, {
    duration: 900,
    enabled: typewriter,
  });

  // Cycle to a fresh line on a randomized 7–10s cadence; disabled under reduced
  // motion (the hero then rests on its initial line).
  useEffect(() => {
    if (!animate) return undefined;
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
  }, [animate]);

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-14 xl:px-20"
      style={{
        // Theme-aware, neutral wash (no blue cast) — a soft radial from the muted
        // surface to the page background, so the hero follows light/dark like the
        // rest of the app and the `--foreground` starfield reads in both.
        background:
          'radial-gradient(ellipse 120% 90% at 64% 38%, hsl(var(--muted)) 0%, hsl(var(--background)) 58%, hsl(var(--background)) 100%)',
      }}
    >
      <ConstellationBackground animate={animate} />

      <div className="relative z-10 max-w-xl">
        {/* Logo + wordmark, 2× the form's compact size, above the title. */}
        <div className="mb-10 flex items-center gap-4">
          <Image
            src="/logo.PNG"
            alt="midnite"
            width={72}
            height={72}
            priority
            className="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-border"
          />
          <Wordmark className="text-4xl text-foreground" />
        </div>

        <div key={copy.title}>
          <div className="flex min-h-[2.5em] items-baseline">
            <h2 className="auth-hero-title text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              {typedTitle}
            </h2>
            <span
              aria-hidden
              className="ml-1 inline-block w-[0.06em] self-stretch bg-[hsl(var(--primary))] text-transparent animate-[blink_1s_step-end_infinite] motion-reduce:animate-none"
            >
              |
            </span>
          </div>
          <p
            className={cn(
              'mt-5 min-h-[3em] text-lg leading-relaxed text-muted-foreground transition-opacity duration-700 ease-out',
              titleDone ? 'opacity-100' : 'opacity-0',
            )}
          >
            {copy.subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
