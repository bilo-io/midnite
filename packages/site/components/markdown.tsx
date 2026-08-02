'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';

import { Prose, ReadingLayoutProvider, proseComponents, type ReadingLinkProps } from '@midnite/ui';

/**
 * Renders a markdown string as styled, read-only content.
 *
 * The element styling comes from `@midnite/ui`'s shared `proseComponents` map
 * (Phase 80) — the same map the docs app feeds to MDX — so reading typography is
 * defined once for the whole repo instead of being hand-rolled here and in docs.
 * This component keeps the plugin wiring: GFM for tables / task lists /
 * strikethrough, and `rehype-highlight` for fenced code, coloured by the `.hljs-*`
 * palette in app/globals.css.
 *
 * `Prose` self-slugifies `h2`/`h3`, so legal docs now carry heading ids — that's
 * what gives them in-page anchors and lets a `TableOfContents` scan them. Nothing
 * here configures `rehype-slug`.
 */

/** Adapts `next/link` to the shape the shared prose map expects. */
function NextReadingLink({ href, className, children }: ReadingLinkProps) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    // Root-relative links in legal copy route through next/link instead of
    // full-page navigating; external ones still open in a new tab (the shared map
    // decides which is which).
    <ReadingLayoutProvider linkComponent={NextReadingLink}>
      <Prose className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={proseComponents}
        >
          {content}
        </ReactMarkdown>
      </Prose>
    </ReadingLayoutProvider>
  );
}
