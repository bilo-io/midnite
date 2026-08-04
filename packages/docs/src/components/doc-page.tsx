import { useEffect } from 'react';

import type { ResolvedRoute } from '../content/registry';

// Renders one MDX page. The prose elements pick up their styling from the
// MDXProvider mapping (app.tsx), and the measured `<article>` around them comes
// from the `ReadingLayout` in layout.tsx (Phase 80) — a page rendering its own
// would nest one article inside another and fight the shell's measure. So this
// just renders the content and keeps the document title in sync.
export function DocPage({ route }: { route: ResolvedRoute }) {
  const { Component, title } = route;

  useEffect(() => {
    document.title = `${title} · Midnite docs`;
  }, [title]);

  return <Component />;
}
