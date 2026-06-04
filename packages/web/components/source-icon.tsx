'use client';

import { useState } from 'react';
import { FileText, Link2, MonitorPlay, StickyNote, type LucideIcon } from 'lucide-react';
import type { SourceKind } from '@midnite/shared';
import { cn } from '@/lib/utils';

// Lucide (this version) ships no brand marks, so GitHub/Figma are inline SVGs;
// the rest map to lucide glyphs.
const LUCIDE_ICON: Partial<Record<SourceKind, LucideIcon>> = {
  'google-docs': FileText,
  notion: StickyNote,
  youtube: MonitorPlay,
  link: Link2,
};

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={cn('h-4 w-4', className)}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function FigmaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn('h-4 w-4', className)}>
      <path d="M8.5 24A3.5 3.5 0 0 0 12 20.5V17H8.5a3.5 3.5 0 1 0 0 7z" />
      <path d="M5 13.5A3.5 3.5 0 0 1 8.5 10H12v7H8.5A3.5 3.5 0 0 1 5 13.5z" />
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3H12v7H8.5A3.5 3.5 0 0 1 5 6.5z" />
      <path d="M12 3h3.5a3.5 3.5 0 1 1 0 7H12V3z" />
      <circle cx="15.5" cy="13.5" r="3.5" />
    </svg>
  );
}

/**
 * The provider icon for a link: its real favicon when resolved, otherwise the
 * brand mark / lucide glyph for the detected kind (falls back to the icon if the
 * favicon fails to load).
 */
export function SourceIcon({
  kind,
  faviconUrl,
  className,
}: {
  kind: SourceKind;
  faviconUrl?: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (faviconUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external favicons, no loader
      <img
        src={faviconUrl}
        alt=""
        onError={() => setBroken(true)}
        className={cn('h-4 w-4 rounded-sm object-contain', className)}
      />
    );
  }
  if (kind === 'github') return <GithubMark className={className} />;
  if (kind === 'figma') return <FigmaMark className={className} />;
  const Icon = LUCIDE_ICON[kind] ?? Link2;
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />;
}
