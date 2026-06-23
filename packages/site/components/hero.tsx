'use client';

import Image from 'next/image';
import { ArrowRight, GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { InlinePanel } from '@/components/panel/inline-panel';
import { useTypewriterCycle, type TitlePair } from '@/components/sections/use-typewriter-cycle';
import { GITHUB_URL } from '@/lib/site';

// Hero headline rotation (Decision §5 — placeholder copy, final wording TBD).
const HERO_PAIRS: TitlePair[] = [
  { title: 'Multitask Claude Code', subtitle: 'A task orchestrator wrapped around a pool of agents.' },
  { title: 'Your agents, in parallel', subtitle: 'Saturate your machine, not your attention.' },
  { title: 'One board, every task', subtitle: 'From a freeform list to a merged PR, tracked live.' },
];

export function Hero() {
  const { title, subtitle, typing } = useTypewriterCycle(HERO_PAIRS);

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col items-center overflow-hidden px-6 pb-16 pt-[16vh] text-center"
    >
      {/* Faint engineering grid between the 3D backdrop and the copy. */}
      <div className="bg-grid pointer-events-none absolute inset-0 -z-0 opacity-60" />

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Soft radial scrim: keeps the busy backdrop from sapping text contrast. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[170%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.78),hsl(var(--background)/0.4)_45%,transparent_70%)]" />

        <div className="mb-6 flex items-center justify-center gap-3">
          <Image
            src="/logo.PNG"
            alt="midnite logo"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl shadow-lg"
            priority
          />
          <span className="font-brand text-2xl tracking-tight">midnite</span>
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_-1px_#10b981]" />
          A task orchestrator for Claude Code
        </div>

        <h1 className="flex min-h-[2.3em] items-end justify-center text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <span>
            <span className="text-gradient" aria-hidden="true">
              {title}
            </span>
            {typing ? <span className="caret align-middle" /> : null}
          </span>
        </h1>
        <p className="mx-auto mt-5 min-h-[3em] max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          <span aria-hidden="true">{subtitle}</span>
        </p>
        {/* Stable text for assistive tech / crawlers regardless of the animation. */}
        <span className="sr-only">midnite — multitask Claude Code. {HERO_PAIRS[0]?.subtitle}</span>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#cli" className="gradient-border rounded-md">
            <Button size="lg" className="w-full sm:w-auto">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline" className="w-full backdrop-blur sm:w-auto">
              <GitBranch className="h-4 w-4" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Mobile: the panel stacks inline (the fixed morphing panel is desktop-only). */}
        <InlinePanel content="terminal" className="mx-auto mt-12" />
      </div>

      {/* Scroll affordance */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-muted-foreground/70">
        Scroll
      </div>
    </section>
  );
}
