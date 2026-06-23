import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { cn } from '@midnite/ui';

export type TocEntry = { id: string; text: string; level: 2 | 3 };

// Reads the anchored headings (rehype-slug stamps the ids — see vite.config.ts /
// markdown-page.tsx) out of the rendered article. Kept pure so it unit-tests
// against a plain DOM node with no router or observer wiring.
export function collectHeadings(root: ParentNode): TocEntry[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map((el) => ({
    id: el.id,
    text: el.textContent?.trim() ?? '',
    level: el.tagName === 'H3' ? 3 : 2,
  }));
}

// On-page navigation (Phase 26 Theme D): a sticky right rail listing the current
// page's h2/h3 sections with a scroll-spy highlight. It scans the rendered article
// rather than the source so both render paths (MDX and react-markdown) feed it
// identically. Links scroll via JS, not `href="#id"` — the app is a hash router,
// so an anchor hash would be read as a route and break navigation.
export function TableOfContents() {
  const { pathname } = useLocation();
  const [headings, setHeadings] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Re-scan whenever the route changes. Content is rendered eagerly (MDX glob is
  // eager; react-markdown is synchronous), so by the time this effect runs the
  // article and its headings are already committed to the DOM.
  useEffect(() => {
    const article = document.querySelector('main article');
    const found = article ? collectHeadings(article) : [];
    setHeadings(found);
    setActiveId(found[0]?.id ?? null);
  }, [pathname]);

  // Scroll-spy: highlight the topmost heading currently in the viewport. Guarded
  // for environments without IntersectionObserver (jsdom) — the rail still renders.
  useEffect(() => {
    if (headings.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b,
        );
        setActiveId(top.target.id);
      },
      // Trip the active heading as it crosses below the sticky header, and stop
      // counting once it's into the lower 70% of the viewport.
      { rootMargin: '-80px 0px -70% 0px' },
    );
    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  // A single-section page doesn't earn a TOC.
  if (headings.length < 2) return null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  return (
    <nav aria-label="On this page" className="text-sm">
      <p className="mb-3 font-medium text-foreground">On this page</p>
      <ul className="space-y-1 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => scrollTo(h.id)}
              aria-current={activeId === h.id ? 'location' : undefined}
              className={cn(
                '-ml-px block w-full border-l border-transparent py-1 pl-3 text-left leading-snug text-muted-foreground transition-colors hover:text-foreground',
                h.level === 3 && 'pl-6',
                activeId === h.id && 'border-foreground font-medium text-foreground',
              )}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
