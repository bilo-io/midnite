'use client';

import { useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/common';
import { cn } from '@/lib/utils';

// Both layers share this exact class list so the invisible textarea's caret and
// text metrics line up pixel-for-pixel with the highlighted overlay behind it.
const TEXT_METRICS = 'whitespace-pre-wrap break-words font-mono text-xs leading-relaxed';

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
};

/**
 * A markdown textarea with live syntax highlighting: a transparent, real
 * `<textarea>` sits on top (carrying the caret + selection + all editing
 * behaviour) over a `<pre>` painted with highlight.js's markdown grammar,
 * scrolled in lockstep. `.hljs`/`.hljs-*` colours come from the shared
 * `@midnite/ui/code-highlight.css` palette (already global) — this component
 * only owns the overlay mechanics.
 */
export function SyntaxMarkdownTextarea({ value, onChange, ariaLabel, className }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const html = useMemo(() => {
    try {
      return hljs.highlight(value, { language: 'markdown' }).value;
    } catch {
      return escapeHtml(value);
    }
  }, [value]);

  const syncScroll = () => {
    if (!preRef.current || !taRef.current) return;
    preRef.current.scrollTop = taRef.current.scrollTop;
    preRef.current.scrollLeft = taRef.current.scrollLeft;
  };

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-border/60 bg-background', className)}>
      <pre
        ref={preRef}
        aria-hidden
        className={cn('hljs pointer-events-none absolute inset-0 m-0 overflow-auto px-3 py-2', TEXT_METRICS)}
      >
        {/* Trailing newline keeps a final blank line's height matching the textarea. */}
        <code className="language-markdown" dangerouslySetInnerHTML={{ __html: `${html}\n` }} />
      </pre>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        aria-label={ariaLabel}
        spellCheck={false}
        className={cn(
          'absolute inset-0 h-full w-full resize-none overflow-auto bg-transparent px-3 py-2 text-transparent caret-foreground outline-none',
          TEXT_METRICS,
        )}
      />
    </div>
  );
}
