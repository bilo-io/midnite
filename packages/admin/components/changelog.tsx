import { Fragment, type ReactNode } from 'react';
import { parseMarkdown, type InlineToken, type MarkdownBlock } from '@/lib/markdown';

/** Render inline tokens (bold / code / link / text) to JSX. */
function renderInline(tokens: InlineToken[]): ReactNode {
  return tokens.map((t, i) => {
    switch (t.type) {
      case 'bold':
        return (
          <strong key={i} className="font-semibold text-foreground">
            {t.value}
          </strong>
        );
      case 'code':
        return (
          <code key={i} className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em]">
            {t.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={i}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:no-underline"
          >
            {t.text}
          </a>
        );
      default:
        return <Fragment key={i}>{t.value}</Fragment>;
    }
  });
}

function renderBlock(block: MarkdownBlock, key: number): ReactNode {
  switch (block.type) {
    case 'heading': {
      if (block.level === 1) {
        return (
          <h2 key={key} className="text-lg font-semibold text-foreground">
            {renderInline(block.tokens)}
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3
            key={key}
            className="mt-4 border-b border-border/60 pb-1 text-base font-semibold text-foreground first:mt-0"
          >
            {renderInline(block.tokens)}
          </h3>
        );
      }
      return (
        <h4 key={key} className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {renderInline(block.tokens)}
        </h4>
      );
    }
    case 'list':
      return (
        <ul key={key} className="flex flex-col gap-1.5 pl-4">
          {block.items.map((item, i) => (
            <li key={i} className="list-disc text-sm text-muted-foreground marker:text-muted-foreground/60">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <p key={key} className="text-sm text-muted-foreground">
          {renderInline(block.tokens)}
        </p>
      );
  }
}

/**
 * Render a Markdown string (the bundled `CHANGELOG.md`) as readable structure —
 * headings, bullet lists, and inline bold/code/links. Parsing is pure + tested
 * (`lib/markdown.ts`); this component only maps the tokens to token-styled JSX.
 */
export function Changelog({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return <div className="flex flex-col gap-2">{blocks.map((b, i) => renderBlock(b, i))}</div>;
}
