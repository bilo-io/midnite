import { Suspense, type ReactNode } from 'react';
import { NavBar } from '@/components/nav-bar';
import { FeatureGate } from '@/components/feature-gate';
import { LiveData } from '@/components/live-data';
import { NotificationsProvider } from '@/components/notifications-provider';
import { CommandPalette } from '@/components/command-palette';
import { PageReveal } from '@/components/page-reveal';
import { SetupNudge } from '@/components/setup-nudge';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <NotificationsProvider>
      <div className="min-h-screen">
        {/* Live task-board updates over WS → data invalidation (polling stays as fallback). */}
        <LiveData />
        {/* ⌘K / Ctrl+K global navigation palette. */}
        <CommandPalette />
        <NavBar />
        {/* Desktop: the sidebar offsets content from the left (`--nav-offset`).
            Phones: no left sidebar, but clear the fixed bottom-tab bar instead. */}
        <main className="transition-[padding] duration-200 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:[padding-left:var(--nav-offset)]">
          {/* Pages read filters/ids from the query string via useSearchParams; under
              static export that needs a Suspense boundary above the page subtree. */}
          <Suspense fallback={null}>
            <PageReveal>{children}</PageReveal>
          </Suspense>
        </main>
        {/* usePathname needs a Suspense boundary under static export. */}
        <Suspense fallback={null}>
          <FeatureGate />
          {/* Soft first-run setup nudge — never blocks the board (Phase 19 C). */}
          <SetupNudge />
        </Suspense>
      </div>
    </NotificationsProvider>
  );
}
