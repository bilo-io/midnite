'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { DeckTheme, Slide } from '@midnite/shared';
import 'reveal.js/reveal.css';
import { buildSlidesHtml, themeStyleVars } from '@/lib/deck-content';
import { cn } from '@/lib/utils';
import './reveal-preview.css';

type Props = {
  slides: Slide[];
  theme?: DeckTheme;
  className?: string;
  /**
   * `embedded` (default) — a bordered 16:9 box for the editor; reveal captures keys
   * only when focused. `present` — fills its container, global keyboard nav
   * (arrows / `f` fullscreen / `esc` overview), for the fullscreen present route.
   */
  mode?: 'embedded' | 'present';
};

/**
 * Client-only reveal.js renderer. reveal + its Markdown plugin + DOMPurify are
 * dynamically imported inside the effect so nothing runs during SSR / static export
 * build. React owns the three wrapper divs; the `.slides` subtree is populated
 * imperatively (innerHTML), so React never reconciles reveal's own DOM mutations.
 * The deck is re-initialised whenever the slide signature (or mode) changes.
 */
export function RevealPreview({ slides, theme, className, mode = 'embedded' }: Props) {
  const revealRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);

  // Only re-init reveal when the actual slide bodies (or mode) change.
  const signature = useMemo(() => `${mode}:${JSON.stringify(slides)}`, [mode, slides]);

  useEffect(() => {
    let deck: { initialize: () => Promise<unknown>; destroy: () => void } | null = null;
    let cancelled = false;
    const present = mode === 'present';

    async function render() {
      const revealEl = revealRef.current;
      const slidesEl = slidesRef.current;
      if (!revealEl || !slidesEl) return;
      try {
        const [{ default: Reveal }, { default: Markdown }, { default: DOMPurify }] =
          await Promise.all([
            import('reveal.js'),
            import('reveal.js/plugin/markdown'),
            import('dompurify'),
          ]);
        if (cancelled) return;
        slidesEl.innerHTML = buildSlidesHtml(slides, (html) => DOMPurify.sanitize(html));
        deck = new Reveal(revealEl, {
          embedded: !present,
          hash: false,
          controls: true,
          progress: true,
          center: true,
          // Present mode owns the whole page → global keyboard; embedded only when focused.
          ...(present ? {} : { keyboardCondition: 'focused' as const }),
          transition: 'slide',
          plugins: [Markdown],
        }) as unknown as typeof deck;
        await deck?.initialize();
      } catch {
        // reveal needs a real layout engine; in jsdom (unit tests) it throws —
        // degrade to a static, readable dump of the slides instead of crashing.
        if (slidesEl && slidesEl.childElementCount === 0) {
          slidesEl.innerHTML = buildSlidesHtml(slides, (html) => html);
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
      try {
        deck?.destroy();
      } catch {
        // Instance may not have finished initialising; nothing to clean up.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures slides+mode
  }, [signature]);

  return (
    <div
      className={cn(
        'reveal-preview relative overflow-hidden bg-background',
        mode === 'present' ? 'reveal-present h-full w-full' : 'rounded-lg border border-border/60',
        className,
      )}
      style={themeStyleVars(theme)}
    >
      <div ref={revealRef} className="reveal">
        <div ref={slidesRef} className="slides" />
      </div>
    </div>
  );
}
