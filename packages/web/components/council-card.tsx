'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';

type Props = {
  council: Council;
  layout: 'list' | 'grid';
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function CouncilCard({ council, layout }: Props) {
  // One logo per distinct provider on the panel, stacked like source favicons.
  const providers = [...new Set(council.participants.map((p) => p.provider))];
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

  if (layout === 'list') {
    return (
      <Link
        href={`/councils/${council.id}`}
        className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium">{council.name}</span>
          {council.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{council.description}</p>
          ) : null}
        </div>
        {logos}
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {plural(council.participants.length, 'participant')}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/councils/${council.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{council.name}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {plural(council.participants.length, 'participant')}
        </span>
      </div>
      {council.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{council.description}</p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        {logos ?? <span />}
      </div>
    </Link>
  );
}
