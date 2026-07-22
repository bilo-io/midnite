'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import type { WindowChromeBridge } from '@midnite/shared';
import { TitleBarDragStrip } from '@midnite/shell';
import { useIsDesktop } from '@/hooks/use-media-query';
import { AuthHero } from '@/components/auth/auth-hero';
import { getWindowChromeBridge } from '@/lib/desktop-bridge';
import { NeuroCloudBackground } from '@midnite/ui';
import { introAtLeast, useAuthIntro } from '@/components/auth/use-auth-intro';
import { Wordmark } from '@/components/wordmark';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/theme/theme-context';
import { useAnimationPrefs } from '@/lib/use-animation-prefs';
import { cn } from '@/lib/utils';

/**
 * Split-screen auth shell (login / register / invite): the neuro-cloud starfield
 * fills the *entire* viewport behind everything, the form floats over it in a
 * frosted-glass panel on the left, and the hero text (logo + wordmark + cycling
 * marketing line) sits on the right two-thirds on desktop. Below `lg` (no hero)
 * a compact logo + wordmark sits atop the form so branding never disappears. A
 * theme toggle floats in the top-right corner of the screen.
 *
 * The starfield is gated on `useIsDesktop()` (not just a `hidden lg:block` class)
 * so its canvas + RAF loop never mount below `lg` — the animation never ships to
 * phones/tablets, which see the form on a plain background. `useIsDesktop` is
 * `false` on the server and first paint, so the form is always usable while the
 * backdrop settles in.
 *
 * Entry choreography (`useAuthIntro`): once per session the starfield fades in,
 * the hero plays its logo → caret → wordmark → glide intro, and the form column
 * stays hidden (inert, so nothing invisible is tabbable) until the final beat,
 * when it cascades in (`.auth-form-cascade` — grandchild blocks stagger, the
 * heading dropping from above and the rest rising from below). Skipped intros
 * land on 'done' at mount + one tick, so the cascade doubles as the ordinary
 * page-load reveal.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const { animate } = useAnimationPrefs();
  const intro = useAuthIntro(animate);
  // Window-chrome bridge, read after mount (this layout is SSR'd in the export).
  const [windowChrome, setWindowChrome] = useState<WindowChromeBridge | null>(null);
  useEffect(() => {
    setWindowChrome(getWindowChromeBridge());
  }, []);
  const formShown = introAtLeast(intro, 'done');
  // The starfield (and its wash) fade in on the intro's first beat.
  const backdropShown = introAtLeast(intro, 'starfield');

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background">
      {/* Frameless desktop window (Phase 81): the auth screens render without the
          app shell (no title bar), so they carry their own top drag strip —
          renders nothing in a browser. */}
      <TitleBarDragStrip windowChrome={windowChrome} />

      {/* Full-viewport neuro-cloud backdrop (desktop only): a soft radial wash for
          depth, then the starfield canvas over it. Both fade in on the first
          intro beat; the form + hero float above at z-10. */}
      {isDesktop && (
        <>
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 z-0 transition-opacity duration-1000',
              backdropShown ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              // Neutral wash (no blue cast) so the field follows light/dark and
              // the `--foreground` stars read in both themes.
              background:
                'radial-gradient(ellipse 110% 90% at 64% 40%, hsl(var(--muted)) 0%, hsl(var(--background)) 60%, hsl(var(--background)) 100%)',
            }}
          />
          <NeuroCloudBackground
            animate={animate}
            className={cn(
              'z-0 transition-opacity duration-1000',
              backdropShown ? 'opacity-100' : 'opacity-0',
            )}
          />
        </>
      )}

      {/* Theme toggle — top-right corner of the whole screen (over everything).
          In the frameless desktop window it moves INTO the title-bar strip:
          vertically centred in the 56px drag zone, above it (z) and opted out
          of the drag region so it stays clickable (Phase 81 polish). */}
      <div
        className={cn(
          windowChrome?.frameless
            ? 'fixed right-3 top-0 z-[80] flex h-14 items-center'
            : 'absolute right-4 top-4 z-20',
        )}
        style={windowChrome?.frameless ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
      >
        <AuthThemeToggle />
      </div>

      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/3">
        <div
          className={cn(
            'w-full max-w-md',
            // Frosted-glass panel over the starfield (desktop): ~50% transparent
            // with a fair blur radius, a hairline border and soft shadow. Mobile
            // has no starfield, so it stays a plain (transparent) block.
            'lg:rounded-2xl lg:border lg:border-border/40 lg:bg-background/50 lg:p-8 lg:shadow-2xl lg:backdrop-blur-2xl',
            formShown ? 'auth-form-cascade' : 'opacity-0',
          )}
          inert={!formShown}
        >
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
        <div className="relative z-10 hidden lg:block lg:w-2/3">
          <AuthHero intro={intro} />
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
