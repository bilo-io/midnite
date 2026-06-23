import type { ComponentType } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { mdxComponents } from './mdx-components';

// Renders raw repo markdown (the project's real docs/*.md, imported as text in
// content/product-docs.tsx) at runtime with react-markdown + remark-gfm. We use
// react-markdown rather than the MDX pipeline on purpose: repo docs contain bare
// `<...>` and `{...}` that MDX would try to parse as JSX / expressions, whereas
// react-markdown renders markdown literally.
//
// The element mapping is the same prose styling the MDX pages get (mdx-components),
// so imported product docs read as one site with the design-system docs. The only
// adaptation: react-markdown passes each renderer a `node` (hast) prop, and the
// shared mapping spreads its props straight onto DOM elements — so we drop `node`
// to avoid React's unknown-attribute warning.
const markdownComponents = Object.fromEntries(
  Object.entries(mdxComponents).map(([tag, Themed]) => {
    const Element = Themed as ComponentType<Record<string, unknown>>;
    return [tag, ({ node: _node, ...props }: { node?: unknown }) => <Element {...props} />];
  }),
) as Components;

export function MarkdownPage({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {source}
    </ReactMarkdown>
  );
}
