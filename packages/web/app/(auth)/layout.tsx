'use client';

import type { ReactNode } from 'react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { AuthHero } from '@/components/auth/auth-hero';

/**
 * Split-screen auth shell (login / register / invite): the form lives in a left
 * column, the living knowledge-graph hero fills the right two-thirds on desktop.
 *
 * The hero is gated on `useIsDesktop()` (not just a `hidden lg:block` class) so
 * its canvas + RAF loop never mount below `lg` — the animation never ships to
 * phones/tablets, which see the form full-width. `useIsDesktop` is `false` on the
 * server and first paint, so the form is always usable while the hero settles in.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/3">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      {isDesktop && (
        <div className="relative hidden lg:block lg:w-2/3">
          <AuthHero />
        </div>
      )}
    </div>
  );
}
