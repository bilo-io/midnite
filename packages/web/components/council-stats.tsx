'use client';

import { Bot, MessagesSquare } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { cn } from '@/lib/utils';

/**
 * Inline member + consultation counts for a council, each with an icon — members
 * (🤖) and consultations/runs (💬). Shared by the councils list/grid/table and
 * the dashboard widget so the two always read the same.
 */
export function CouncilStats({ council, className }: { council: Council; className?: string }) {
  const consultations = council.consultationCount ?? 0;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground',
        className,
      )}
    >
      <span className="flex items-center gap-1" title={`${council.members.length} members`}>
        <Bot className="h-3.5 w-3.5" />
        {council.members.length}
      </span>
      <span className="flex items-center gap-1" title={`${consultations} consultations`}>
        <MessagesSquare className="h-3.5 w-3.5" />
        {consultations}
      </span>
    </span>
  );
}
