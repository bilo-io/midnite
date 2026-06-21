import type { ReactNode } from 'react';

import { Nav } from '@/components/nav';
import { Footer } from '@/components/footer';
import { LegalSidebar } from '@/components/legal-sidebar';

// Nested sub-layout for legal docs: a sidebar of all docs beside a content area that
// renders pretty-printed markdown. Calm and read-focused (no particle canvas).
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-30" aria-hidden />
        <div className="container scroll-mt-20 py-28">
          <div className="grid gap-10 md:grid-cols-[12rem_1fr] lg:grid-cols-[14rem_1fr]">
            <aside className="md:sticky md:top-24 md:self-start">
              <LegalSidebar />
            </aside>
            <article className="min-w-0 max-w-3xl">{children}</article>
          </div>
        </div>
        <Footer />
      </main>
    </>
  );
}
