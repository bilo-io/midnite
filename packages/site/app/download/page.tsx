import type { Metadata } from 'next';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { Reveal } from '@/components/ui/section';
import { DownloadPicker } from '@/components/download-picker';

export const metadata: Metadata = {
  title: 'Download midnite',
  description: 'Download the midnite desktop app for macOS, Windows, or Linux.',
};

export default function DownloadPage() {
  return (
    <>
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
