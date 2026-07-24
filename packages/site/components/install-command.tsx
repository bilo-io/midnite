'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * The macOS install one-liner as a copyable terminal block: the command in a
 * horizontally-scrollable <code> with a copy button that confirms for a moment.
 * Used by the landing page's download section and the /download picker.
 */
export function InstallCommand({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      clearTimeout(timer.current ?? undefined);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the command stays visible for manual selection.
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-2 pl-4 text-left backdrop-blur',
        className,
      )}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-xs text-foreground/90 sm:text-sm">
        <span aria-hidden className="select-none text-muted-foreground">
          ${' '}
        </span>
        {command}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? 'Copied' : 'Copy install command'}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5',
          'text-xs font-medium text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
      >
        {copied ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Copy aria-hidden className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
