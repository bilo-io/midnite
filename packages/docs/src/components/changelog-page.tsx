import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { MarkdownPage } from './markdown-page';

/**
 * The repo CHANGELOG rendered as a docs page (Phase 71 Theme F). Deep-linkable per
 * version: the update banner opens `#/changelog?v=<version>` in a new tab, and this
 * page reads the `?v=` query and scrolls to that version's `## [x.y.z]` section.
 *
 * Docs uses a HashRouter, so a native `#anchor` can't ride alongside the route hash —
 * hence the query-param + scroll-on-mount approach. We locate the section by matching
 * the heading text (`[<version>]`) rather than a slug, so it never drifts from
 * rehype-slug's id derivation.
 */
export function ChangelogPage({ source }: { source: string }) {
  const [params] = useSearchParams();
  const version = params.get('v');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!version) return;
    const root = rootRef.current;
    if (!root) return;
    const heading = Array.from(root.querySelectorAll('h2')).find((h) =>
      (h.textContent ?? '').includes(`[${version}]`),
    );
    if (!heading) return;
    if (typeof heading.scrollIntoView === 'function') {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Move focus to the heading so keyboard users land at the right section too.
    heading.setAttribute('tabindex', '-1');
    heading.focus?.({ preventScroll: true });
  }, [version]);

  return (
    <div ref={rootRef}>
      <MarkdownPage source={source} />
    </div>
  );
}
