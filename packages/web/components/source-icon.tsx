'use client';

import { useState } from 'react';
import { FileText, Link2, MonitorPlay, StickyNote, type LucideIcon } from 'lucide-react';
import type { SourceKind } from '@midnite/shared';
import { cn } from '@/lib/utils';

const KIND_ICON: Record<SourceKind, LucideIcon> = {
  'google-docs': FileText,
  notion: StickyNote,
  youtube: MonitorPlay,
  link: Link2,
};

/**
 * The provider icon for a source link: its real favicon when we resolved one,
 * otherwise a lucide icon mapped from the detected kind (falls back to the icon
 * if the favicon fails to load).
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
  const Icon = KIND_ICON[kind];
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />;
}
