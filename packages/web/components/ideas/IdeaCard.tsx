'use client';

import { useRouter } from 'next/navigation';
import type { Idea } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { IdeaStatusChip } from './IdeaStatusChip';

export function IdeaCard({ idea }: { idea: Idea }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/ideas/${idea.id}`)}
      className={cn(
        'group flex cursor-pointer flex-col gap-2 rounded-lg border border-border/60 p-4',
        'hover:border-foreground/20 hover:bg-muted/30 transition-colors',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{idea.title}</h3>
        <IdeaStatusChip status={idea.status} />
      </div>
      {idea.body && (
        <p className="line-clamp-3 text-xs text-muted-foreground">{idea.body}</p>
      )}
      <div className="mt-auto flex items-center justify-between pt-1">
        <div className="flex flex-wrap gap-1">
          {idea.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {new Date(idea.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
