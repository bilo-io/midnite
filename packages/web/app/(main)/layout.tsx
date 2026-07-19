'use client';

import { useCallback, useRef, Suspense, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppShellClient } from '@/components/app-shell-client';
import { AppBackdrop } from '@/components/app-backdrop';
import { AuthGuard } from '@/components/auth-guard';
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
import { GuideOverlay } from '@/components/guide/guide-overlay';
import { GuideAutoLaunch } from '@/components/guide/guide-auto-launch';
import { GuidePendingReplay } from '@/components/guide/guide-pending-replay';
import { queryClient } from '@/lib/query-client';

export default function MainLayout({ children }: { children: ReactNode }) {
  const openWizardRef = useRef<(() => void) | null>(null);
  const registerOpen = useCallback((fn: () => void) => { openWizardRef.current = fn; }, []);
  const openWizard = useCallback(() => openWizardRef.current?.(), []);

  return (
    <QueryClientProvider client={queryClient}>
    <NotificationsProvider>
    <PaletteCommandsProvider>
      {/* `relative isolate` + an opaque `bg-background` base so the app-wide
          backdrop (starfield by default) can pin at `-z-10` behind every page
          while content floats above it. */}
      <div className="relative isolate min-h-screen bg-background">
        <AppBackdrop />
        <AuthGuard />
        <LiveData />
        <PreferenceSync />
        <CommandPalette />
        <GlobalKeymap />
        <PullToRefresh />
        {/* The shared app frame (Phase 73 Theme C): sidenav rail + mobile nav +
            the padded content region. Its `<main>` reserves the rail width via
            `--nav-offset`; everything else here floats as a sibling. */}
        <AppShellClient>
          <Suspense fallback={null}>
            <PageReveal>{children}</PageReveal>
          </Suspense>
        </AppShellClient>
        <Suspense fallback={null}>
          <FeatureGate />
          <SetupNudge onOpenWizard={openWizard} />
        </Suspense>
        <AssistantFab />
        <GuideOverlay />
        <GuideAutoLaunch />
        <GuidePendingReplay />
        <SetupWizardController onOpenWizard={registerOpen} />
      </div>
    </PaletteCommandsProvider>
    </NotificationsProvider>
    </QueryClientProvider>
  );
}
