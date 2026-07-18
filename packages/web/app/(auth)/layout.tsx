'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import { useIsDesktop } from '@/hooks/use-media-query';
import { AuthHero } from '@/components/auth/auth-hero';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/theme/theme-context';

/**
 * Split-screen auth shell (login / register / invite): the form lives in a left
 * column, the living knowledge-graph hero fills the right two-thirds on desktop.
 * On desktop the logo + wordmark sit above the hero title (2× size); below `lg`
 * (no hero) a compact logo + wordmark sits atop the form so branding never
 * disappears. A theme toggle floats in the top-right corner of the screen.
 *
 * The hero is gated on `useIsDesktop()` (not just a `hidden lg:block` class) so
 * its canvas + RAF loop never mount below `lg` — the animation never ships to
 * phones/tablets, which see the form full-width. `useIsDesktop` is `false` on the
 * server and first paint, so the form is always usable while the hero settles in.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Theme toggle — top-right corner of the whole screen (over the hero). */}
      <div className="absolute right-4 top-4 z-20">
        <AuthThemeToggle />
      </div>

      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/3">
        <div className="w-full max-w-sm">
          {/* Compact branding for small screens only — desktop shows it in the hero. */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Image
              src="/logo.PNG"
              alt="midnite"
              width={36}
              height={36}
              priority
              className="h-9 w-9 rounded-full object-cover ring-1 ring-border"
            />
            <Wordmark className="text-xl text-foreground" />
          </div>
          {children}
        </div>
      </div>

      {isDesktop && (
        <div className="relative hidden lg:block lg:w-2/3">
          <AuthHero />
        </div>
      )}
    </div>
  );
}

/** Simple click-to-flip light/dark toggle (no dropdown) for the auth corner. */
function AuthThemeToggle() {
  const { resolved, setPreference } = useTheme();
  const Icon = resolved === 'dark' ? Sun : Moon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
      onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
