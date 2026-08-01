'use client';

import { useEffect, useState, type RefObject } from 'react';

import { cn } from '../../lib/cn';

export type TocEntry = { id: string; text: string; level: 2 | 3 };

/** Marks the article `ReadingLayout` renders, so an unscoped TOC can find it. */
export const READING_ARTICLE_ATTR = 'data-reading-article';

/**
 * Reads the anchored headings out of a rendered article. Pure, so it unit-tests
 * against a detached DOM node with no observer or layout wiring.
 */
export function collectHeadings(root: ParentNode): TocEntry[] {
  return Array.from(root.querySelectorAll<HTMLHeadingElement>('h2[id], h3[id]')).map((el) => ({
    id: el.id,
    text: el.textContent?.trim() ?? '',
    level: el.tagName === 'H3' ? 3 : 2,
  }));
}

export type TableOfContentsProps = {
  /**
   * The article to scan. Defaults to the nearest element `ReadingLayout` marked,
   * so the common case needs no wiring; pass a ref to scope it explicitly (e.g.
   * two articles on one page).
   */
  containerRef?: RefObject<HTMLElement | null>;
  /** Changing this forces a re-scan — pass the route or document id. */
  scanKey?: string | number;
  /** Heading above the list. */
  label?: string;
  className?: string;
};

/**
 * The scroll-spy rail: lists the article's `h2`/`h3` sections and highlights the
 * one currently in view. Router-agnostic by design (Phase 80 Decision 3) — clicks
 * call `scrollIntoView` rather than relying on `href="#id"`, because docs runs a
 * hash router where an anchor hash reads as a route. The site still gets real
 * `#id` deep-links for free, since the headings carry ids either way.
 */
export function TableOfContents({
  containerRef,
  scanKey,
  label = 'On this page',
  className,
}: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Scan on mount and whenever `scanKey` changes, then keep watching: markdown
  // that streams in or a client-side route swap replaces the article's children
  // without remounting the rail, and a stale list is worse than none.
  useEffect(() => {
    const root = containerRef?.current ?? document.querySelector(`[${READING_ARTICLE_ATTR}]`);
    if (!root) {
      setHeadings([]);
      return;
    }

    const rescan = () => {
      const found = collectHeadings(root);
      setHeadings((prev) =>
        prev.length === found.length && prev.every((h, i) => h.id === found[i]?.id) ? prev : found,
      );
    };
    rescan();

    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(rescan);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef, scanKey]);

  // Default the highlight to the first section until the spy reports one.
  useEffect(() => {
    setActiveId((prev) =>
      prev && headings.some((h) => h.id === prev) ? prev : (headings[0]?.id ?? null),
    );
  }, [headings]);

  // Scroll-spy: highlight the topmost heading in view. Guarded for environments
  // without IntersectionObserver (jsdom) — the rail still renders and still links.
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
    <nav aria-label={label} className={cn('text-sm', className)}>
      <p className="mb-3 font-medium text-foreground">{label}</p>
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
