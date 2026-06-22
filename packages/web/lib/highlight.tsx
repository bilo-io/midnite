import { Fragment, type ReactNode } from 'react';

/**
 * Render a search snippet whose only markup is `<mark>…</mark>` (the surrounding
 * text is raw entity content). We split on the literal tags and emit the matched
 * spans as real `<mark>` elements while letting React escape everything else — so
 * we get highlighting without `dangerouslySetInnerHTML` (and without its XSS
 * surface). Shared by the command palette and the /search page.
 */
export function renderSnippet(snippet: string): ReactNode[] {
  const parts = snippet.split(/(<mark>|<\/mark>)/);
  let marking = false;
  return parts.map((part, i) => {
    if (part === '<mark>') {
      marking = true;
      return null;
    }
    if (part === '</mark>') {
      marking = false;
      return null;
    }
    if (!part) return null;
    return marking ? (
      <mark key={i} className="rounded-sm bg-primary/25 px-0.5 text-foreground">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    );
  });
}
