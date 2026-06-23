import { useEffect } from 'react';

import type { ResolvedRoute } from '../content/registry';

// Renders one MDX page. The prose elements pick up their styling from the
// MDXProvider mapping (app.tsx); this just frames the content column and keeps
// the document title in sync with the active page.
export function DocPage({ route }: { route: ResolvedRoute }) {
  const { Component, title } = route;

  useEffect(() => {
    document.title = `${title} · midnite docs`;
  }, [title]);

  return (
    <article className="max-w-3xl pb-16">
      <Component />
    </article>
  );
}
