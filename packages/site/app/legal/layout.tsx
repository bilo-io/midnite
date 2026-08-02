import type { ReactNode } from 'react';

import { ReadingLayout, TableOfContents } from '@midnite/ui';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { LegalSidebar } from '@/components/legal-sidebar';

// Nested sub-layout for legal docs: a sidebar of all docs beside a content area that
// renders pretty-printed markdown. Calm and read-focused (no particle canvas).
//
// The reading columns come from `@midnite/ui`'s `ReadingLayout` (Phase 80) — the same
// shell the docs app reads on — which is where the right-rail table of contents comes
// from. These pages had no on-page navigation before; the headings feeding the rail
// are self-slugged by the shared `Prose` map inside <Markdown>, not by a build plugin.
//
// Two deliberate bits of wiring:
//  - the outer `container py-28` wrapper stays, and the primitive's own max-width and
//    padding are neutralised, so this route keeps its existing rhythm and its
//    clearance under the fixed nav — the migration is visually a no-op but for the rail;
//  - `sidebarMobile="inline"` because the legal sidebar is the *only* route to the
//    other documents. Docs can hide its column below `md` (it has a hamburger drawer);
//    doing that here would strand a phone reader on whichever doc they landed on.
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-30" aria-hidden />
        <div className="container scroll-mt-20 py-28">
          <ReadingLayout
            className="max-w-none gap-10 px-0 py-0 md:grid-cols-[12rem_1fr] lg:grid-cols-[14rem_1fr] xl:grid-cols-[14rem_1fr_14rem]"
            sidebar={<LegalSidebar />}
            sidebarMobile="inline"
            sidebarClassName="md:sticky md:top-24 md:self-start"
            toc={<TableOfContents />}
          >
            {children}
          </ReadingLayout>
        </div>
        <Footer />
      </main>
    </>
  );
}
