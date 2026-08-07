'use client';

import { DynamicBackground, NeuroCloudBackground } from '@midnite/ui';

import { cn } from '@/lib/utils';
import { useBackgroundPattern } from '@/lib/use-background-pattern';

/**
 * The app-wide decorative backdrop, mounted once behind every `(main)` page.
 * Renders the user's chosen background pattern (Settings → Appearance),
 * defaulting to `none` — a subtle theme-matching gradient wash rather than the
 * neuro-cloud `starfield`, which is now opt-in. It's fixed to the viewport and
 * pinned at `-z-10` inside the layout's `isolate` stacking context, so it sits
 * above the opaque base but below all content — the nav rail, the (transparent-
 * until-scrolled) dashboard header, and page content all float over it.
 *
 * The starfield reads the live theme/accent CSS tokens, so it re-tints with the
 * active theme; `animate` follows the "Dynamic motion" toggle + motion prefs
 * (reduced motion paints a single static frame). Other patterns keep the
 * existing canvas (`dynamic`) / static-CSS (`data-bg-target`) rendering — except
 * `none`, which is always the static wash: it has no canvas twin, so routing it
 * through `<DynamicBackground>` under "Dynamic motion" would clear every frame
 * and leave the backdrop blank.
 */
export function AppBackdrop() {
  const { pattern, className, dynamic } = useBackgroundPattern();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {pattern === 'starfield' ? (
        <NeuroCloudBackground animate={dynamic} />
      ) : dynamic && pattern !== 'none' ? (
        <DynamicBackground pattern={pattern} />
      ) : (
        <div data-bg-target className={cn('absolute inset-0', className)} />
      )}
    </div>
  );
}
