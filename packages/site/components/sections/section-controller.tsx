'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { SECTION_IDS } from './registry';

// The scroll controller: a single source of truth for "which section is active",
// tracked with one IntersectionObserver and exposed via context. State only changes
// when the active section changes (not on every scroll frame), so subscribers
// (typed titles now; the panel + particle field in Themes B/C) don't re-render on
// the scroll hot path. `undefined` means "no provider mounted".
const ActiveSectionContext = createContext<string | null | undefined>(undefined);

export function SectionProvider({
  children,
  ids = SECTION_IDS,
}: {
  children: ReactNode;
  ids?: string[];
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // Track each section's latest visibility ratio; the most-visible wins.
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        // Sticky: only advance when some section is visible. When everything leaves
        // the viewport (hero / footer, which aren't observed) the last active section
        // stays active rather than flickering to null — type-once consumers want that.
        if (best) setActive(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-20% 0px -20% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return <ActiveSectionContext.Provider value={active}>{children}</ActiveSectionContext.Provider>;
}

export function useActiveSection(): string | null | undefined {
  return useContext(ActiveSectionContext);
}

/**
 * True when `id` is the active section. With no `SectionProvider` above it
 * (context `undefined`), returns true so a standalone `<TypedTitle>` still animates
 * on mount instead of waiting forever.
 */
export function useIsSectionActive(id?: string): boolean {
  const active = useActiveSection();
  if (active === undefined) return true;
  if (!id) return true;
  return active === id;
}
