import { Suspense, type ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';
import { FeatureGate } from '@/components/feature-gate';
import { LiveData } from '@/components/live-data';
import { CommandPalette } from '@/components/command-palette';
import { PageReveal } from '@/components/page-reveal';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Live task-board updates over WS → data invalidation (polling stays as fallback). */}
      <LiveData />
      {/* ⌘K / Ctrl+K global navigation palette. */}
      <CommandPalette />
      <NavBar />
      <main className="transition-[padding] duration-200" style={{ paddingLeft: 'var(--nav-offset)' }}>
        {/* Pages read filters/ids from the query string via useSearchParams; under
            static export that needs a Suspense boundary above the page subtree. */}
        <Suspense fallback={null}>
          <PageReveal>{children}</PageReveal>
        </Suspense>
      </main>
      {/* usePathname needs a Suspense boundary under static export. */}
      <Suspense fallback={null}>
        <FeatureGate />
      </Suspense>
    </div>
  );
}
