'use client';

import type { Idea } from '@midnite/shared';
import { IdeaCard } from './IdeaCard';

export function IdeaGrid({ ideas }: { ideas: Idea[] }) {
  if (ideas.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No ideas yet. Create your first one.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}
