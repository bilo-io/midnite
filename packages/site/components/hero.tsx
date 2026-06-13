import { ArrowRight, GitBranch } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { GITHUB_URL } from '@/lib/site';

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 pt-14"
    >
      {/* Faint engineering grid sits between the 3D backdrop and the copy. */}
      <div className="bg-grid pointer-events-none absolute inset-0 -z-0 opacity-60" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        {/* Soft radial scrim: darkens the area right behind the copy so the orb
            stays a vivid centrepiece without sapping text contrast. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[140%] w-[160%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--background)/0.72),hsl(var(--background)/0.35)_45%,transparent_70%)]" />

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_-1px_#10b981]" />
          A task orchestrator for Claude Code
        </div>

        <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          Run Claude Code
          <br />
          <span className="text-gradient">in parallel.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Drop in a freeform list. midnite classifies each item, queues what&apos;s ready, and runs
          them across a pool of agents — every task tracked on one live board.
        </p>

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
      </div>

      {/* Scroll affordance */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-widest text-muted-foreground/70">
        Scroll
      </div>
    </section>
  );
}
