import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GithubIcon } from '@midnite/ui';

import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/ui/section';
import { GITHUB_URL } from '@/lib/site';
import { LEGAL_DOCS } from '@/lib/legal';

export function Footer() {
  return (
    <footer className="relative z-10">
      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <Reveal className="gradient-border overflow-hidden rounded-2xl">
          <div className="relative isolate rounded-2xl border border-border/70 bg-card/50 px-8 py-16 text-center backdrop-blur">
            <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" />
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop running tasks one at a time.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
              Spin up midnite, point it at your repo, and let a pool of agents clear your backlog
              while you review the results.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Button size="lg">
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline">
                  <GithubIcon className="h-4 w-4" />
                  GitHub
                </Button>
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer bar */}
      <div className="border-t border-border/60">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#3b82f6]" />
            <span className="font-brand">midnite</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="/#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="/#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="/#cli" className="transition-colors hover:text-foreground">
              CLI
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-foreground"
            >
              GitHub
            </a>
            {LEGAL_DOCS.map((doc) => (
              <Link
                key={doc.slug}
                href={`/legal/${doc.slug}`}
                className="transition-colors hover:text-foreground"
              >
                {doc.title}
              </Link>
            ))}
          </nav>
          <p className="text-muted-foreground/60">Multitask Claude Code</p>
        </div>
      </div>
    </footer>
  );
}
