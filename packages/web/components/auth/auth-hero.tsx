'use client';

import { useMemo } from 'react';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { useTypewriter } from '@/lib/use-typewriter';
import { ConstellationBackground } from '@/components/auth/constellation-background';

/**
 * Right two-thirds of the split-screen auth hero (desktop-only — the layout gates
 * it below `lg`). A deep-space panel with the living knowledge-graph starfield
 * behind a logo + a login-specific typewriter title/subtitle. Distinct from the
 * dashboard/quote copy: a small curated set (below), one pair picked at random per
 * mount. Reduced-motion (Motion setting or OS) resolves the copy immediately and
 * the starfield paints a static frame — see `ConstellationBackground`.
 */

export type AuthHeroCopy = { title: string; subtitle: string };

/** Curated, offline copy set — reviewable, fast, no per-load LLM. One pair per mount. */
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

export function AuthHero() {
  const { animate, typewriter } = useAnimationPrefs();
  // Chosen once per mount (client-only — the layout mounts this after hydration).
  const copy = useMemo(() => pickAuthHeroCopy(), []);
  const { typed: title } = useTypewriter(copy.title, { enabled: typewriter, duration: 700 });
  const { typed: subtitle } = useTypewriter(copy.subtitle, { enabled: typewriter, duration: 900 });

  return (
    <div
      className="relative flex h-full w-full flex-col justify-center overflow-hidden px-14 xl:px-20"
      style={{
        // Deep-space wash — intentionally dark in both app themes so stars read.
        background:
          'radial-gradient(ellipse 120% 90% at 64% 38%, hsl(230 45% 13%) 0%, hsl(235 52% 7%) 46%, hsl(240 60% 3%) 100%)',
      }}
    >
      <ConstellationBackground animate={animate} />

      <div className="relative z-10 max-w-xl">
        <h2
          className="min-h-[2.5em] text-4xl font-semibold leading-tight text-white xl:text-5xl"
          aria-live="polite"
        >
          {title}
        </h2>
        <p className="mt-5 min-h-[3em] text-lg leading-relaxed text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}
