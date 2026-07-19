'use client';

import { type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '@midnite/ui/theme';

/**
 * The frame-level provider stack both `web` and `admin` share (Phase 73 Theme B).
 *
 * Deliberately **app-agnostic**: it bundles only the providers that carry no
 * gateway coupling — `ThemeProvider` (from `@midnite/ui`, drives the `dark` class
 * + theme runtime) and `QueryClientProvider` (the host supplies its own
 * `QueryClient`, so shell never owns fetch/cache policy). The **app-specific**
 * providers (Auth, WebSocket/live-data, Notifications, PreferenceSync — all coupled
 * to a concrete gateway client) are passed in as `children`, keeping shell free of
 * any gateway import. A host composes them inside:
 *
 * ```tsx
 * <ShellProviders queryClient={queryClient}>
 *   <AuthProvider>…<AppearanceEffects />…{app}</AuthProvider>
 * </ShellProviders>
 * ```
 *
 * Appearance is applied pre-paint by `appearanceInitScript` (in the document head)
 * and kept live by the host's appearance-effects component, mounted as a child.
 */
export type ShellProvidersProps = {
  /** The host app's TanStack Query client (shell never creates one). */
  queryClient: QueryClient;
  children: ReactNode;
};

export function ShellProviders({ queryClient, children }: ShellProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
