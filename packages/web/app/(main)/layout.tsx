'use client';

import { useCallback, useRef, Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { NavBar } from '@/components/nav-bar';
import { FeatureGate } from '@/components/feature-gate';
import { LiveData } from '@/components/live-data';
import { PreferenceSync } from '@/components/preference-sync';
import { NotificationsProvider } from '@/components/notifications-provider';
import { CommandPalette } from '@/components/command-palette';
import { GlobalKeymap } from '@/components/global-keymap';
import { PaletteCommandsProvider } from '@/lib/palette-commands';
import { PageReveal } from '@/components/page-reveal';
import { SetupNudge } from '@/components/setup-nudge';
import { SetupWizardController } from '@/components/SetupWizard';
import { PullToRefresh } from '@/components/pull-to-refresh';
import { AssistantFab } from '@/components/assistant/assistant-fab';
import { queryClient } from '@/lib/query-client';

export default function MainLayout({ children }: { children: ReactNode }) {
  const openWizardRef = useRef<(() => void) | null>(null);
  const registerOpen = useCallback((fn: () => void) => { openWizardRef.current = fn; }, []);
  const openWizard = useCallback(() => openWizardRef.current?.(), []);

  return (
    <QueryClientProvider client={queryClient}>
    <NotificationsProvider>
    <PaletteCommandsProvider>
      <div className="min-h-screen">
        <LiveData />
        <PreferenceSync />
        <CommandPalette />
        <GlobalKeymap />
        <NavBar />
        <PullToRefresh />
        <main className="transition-[padding] duration-200 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:[padding-left:var(--nav-offset)]">
          <Suspense fallback={null}>
            <PageReveal>{children}</PageReveal>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <FeatureGate />
          <SetupNudge onOpenWizard={openWizard} />
        </Suspense>
        <AssistantFab />
        <SetupWizardController onOpenWizard={registerOpen} />
      </div>
    </PaletteCommandsProvider>
    </NotificationsProvider>
    </QueryClientProvider>
  );
}
