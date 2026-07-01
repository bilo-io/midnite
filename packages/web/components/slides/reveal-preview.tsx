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
};

/**
 * Client-only reveal.js live preview. reveal + its Markdown plugin + DOMPurify are
 * dynamically imported inside the effect so nothing runs during SSR / static export
 * build. React owns the three wrapper divs; the `.slides` subtree is populated
 * imperatively (innerHTML), so React never reconciles reveal's own DOM mutations.
 * The deck is re-initialised whenever the slide signature changes.
 */
export function RevealPreview({ slides, theme, className }: Props) {
  const revealRef = useRef<HTMLDivElement>(null);
  const slidesRef = useRef<HTMLDivElement>(null);

  // Only re-init reveal when the actual slide bodies change, not on every render.
  const signature = useMemo(() => JSON.stringify(slides), [slides]);

  useEffect(() => {
    let deck: { initialize: () => Promise<unknown>; destroy: () => void } | null = null;
    let cancelled = false;

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
          embedded: true,
          hash: false,
          controls: true,
          progress: true,
          keyboardCondition: 'focused',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures `slides`
  }, [signature]);

  return (
    <div
      className={cn(
        'reveal-preview relative overflow-hidden rounded-lg border border-border/60 bg-background',
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
