'use client';

import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

/**
 * Shown on a project that was promoted from an idea — a back-link to the source
 * idea. The idea persists as a living document; this is the navigational bridge.
 */
export function IdeaSourceBadge({ ideaId }: { ideaId: string }) {
  return (
    <Link
      href={`/ideas/view?id=${ideaId}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
      Created from idea
    </Link>
  );
}
