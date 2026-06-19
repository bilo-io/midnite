'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';
import type { Brainstorm } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { SelectableIcon } from '@/components/selectable-icon';
import { cn } from '@/lib/utils';

type Props = {
  brainstorm: Brainstorm;
  layout: 'list' | 'grid';
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function BrainstormCard({ brainstorm, layout, selected = false, onToggleSelect }: Props) {
  // One logo per distinct provider on the panel, stacked like source favicons.
  const providers = [...new Set(brainstorm.contributors.map((c) => c.provider))];
  const logos =
    providers.length > 0 ? (
      <div className="flex items-center -space-x-1">
        {providers.slice(0, 5).map((cli) => (
          <span
            key={cli}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background"
          >
            <AgentCliLogo cli={cli} className="h-3 w-3" />
          </span>
        ))}
      </div>
    ) : null;

  const selectIcon = (
    <SelectableIcon Icon={Brain} selected={selected} onToggle={(sk) => onToggleSelect?.(sk)} />
  );

  const archivedBadge = brainstorm.archived ? (
    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Archived
    </span>
  ) : null;

  if (layout === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40',
          selected && 'border-primary/50 bg-accent/30',
          brainstorm.archived && 'opacity-60',
        )}
      >
        {selectIcon}
        <Link href={`/brainstorms/view?id=${brainstorm.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {archivedBadge}
            <span className="truncate text-sm font-medium">{brainstorm.name}</span>
          </div>
          {brainstorm.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{brainstorm.description}</p>
          ) : null}
        </Link>
        {logos}
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {plural(brainstorm.contributors.length, 'contributor')}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40',
        selected && 'border-primary/50 bg-accent/30',
        brainstorm.archived && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {selectIcon}
          {archivedBadge}
          <Link
            href={`/brainstorms/view?id=${brainstorm.id}`}
            className="truncate text-sm font-medium"
          >
            {brainstorm.name}
          </Link>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {plural(brainstorm.contributors.length, 'contributor')}
        </span>
      </div>
      {brainstorm.description ? (
        <Link href={`/brainstorms/view?id=${brainstorm.id}`} className="block">
          <p className="line-clamp-2 text-xs text-muted-foreground">{brainstorm.description}</p>
        </Link>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">{logos ?? <span />}</div>
    </div>
  );
}
