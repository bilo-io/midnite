import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';

import { SceneBackdrop } from '@/components/scene/scene-backdrop';
import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Reveal } from '@/components/ui/section';
import { DownloadPicker } from '@/components/download-picker';
import { DESKTOP_VERSION } from '@/lib/downloads';
import { RELEASES_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Download midnite',
  description: 'Download the midnite desktop app for macOS, Windows, or Linux.',
};

export default function DownloadPage() {
  return (
    <>
      {/* Share the landing page's particle field + theming so the route feels part
          of the same site (the panel mechanic stays landing-only). */}
      <SceneBackdrop />
      <Nav />
      <main className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-40" aria-hidden />
        <section className="container scroll-mt-20 py-28">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
                Download midnite
              </h1>
              <p className="mt-4 text-muted-foreground">
                The gateway and the board, bundled into one desktop app that runs entirely on your
                machine. We&apos;ll surface the build for your platform — and you can always grab the
                others.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border border-border/60 bg-card/40 px-3 py-1 font-mono text-xs">
                  v{DESKTOP_VERSION}
                </span>
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                >
                  Release notes
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100} className="mt-12">
            <DownloadPicker />
          </Reveal>
        </section>
        <Footer />
      </main>
    </>
  );
}
