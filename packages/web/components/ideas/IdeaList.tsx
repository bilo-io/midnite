'use client';

import { useRouter } from 'next/navigation';
import type { Idea } from '@midnite/shared';
import { IdeaStatusChip } from './IdeaStatusChip';

export function IdeaList({ ideas }: { ideas: Idea[] }) {
  const router = useRouter();

  if (ideas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No ideas yet. Create your first one.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/40 rounded-lg border border-border/60">
      {ideas.map((idea) => (
        <div
          key={idea.id}
          onClick={() => router.push(`/ideas/view?id=${idea.id}`)}
          className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{idea.title}</span>
              <IdeaStatusChip status={idea.status} />
            </div>
            {idea.body && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {idea.body.slice(0, 120)}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(idea.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
