'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

/**
 * Renders a markdown string as styled, read-only content. Adapted from
 * packages/web/components/markdown-preview.tsx (the boundary forbids importing it);
 * tuned a little more generously here for full-page legal docs. GFM enabled for
 * tables / task lists / strikethrough. Elements are styled individually (no
 * typography plugin) so everything reads from theme tokens.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('text-[15px] leading-relaxed text-foreground', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 mt-8 text-2xl font-semibold tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-8 text-xl font-semibold tracking-tight first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-6 text-base font-semibold first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => <h4 className="mb-1.5 mt-4 text-sm font-semibold">{children}</h4>,
          p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-border pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-border/60" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 bg-muted/40 px-3 py-2 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-3 py-2 align-top">{children}</td>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-md bg-muted/60 p-4 font-mono text-sm leading-relaxed">
              {children}
            </pre>
          ),
          code: ({ className: cls, children }) => {
            const isBlock = /language-/.test(cls ?? '') || /\n/.test(String(children));
            if (isBlock) return <code className="font-mono">{children}</code>;
            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
