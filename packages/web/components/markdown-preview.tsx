'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Renders a markdown string as styled, read-only "pretty" content. GFM is
 * enabled for tables, task lists, and strikethrough. Elements are styled
 * individually (no typography plugin in this project), tuned to match the rest
 * of the UI.
 */
export function MarkdownPreview({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('text-sm leading-relaxed text-foreground', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-5 text-lg font-semibold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
              {children}
            </h3>
          ),
          h4: ({ children }) => <h4 className="mb-1.5 mt-3 text-sm font-semibold">{children}</h4>,
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
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
            <blockquote className="my-3 border-l-2 border-border pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border/60" />,
          input: ({ checked, type }) =>
            type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mr-1.5 h-3.5 w-3.5 translate-y-0.5 accent-foreground"
              />
            ) : null,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 bg-muted/40 px-2 py-1 text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-2 py-1 align-top">{children}</td>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">
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
