'use client';

import { useRouter } from 'next/navigation';
import type { Idea } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { IdeaStatusChip } from './IdeaStatusChip';

export function IdeaTable({ ideas }: { ideas: Idea[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Tags</th>
            <th className="px-3 py-2 font-medium text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {ideas.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-sm text-muted-foreground">
                No ideas yet. Create your first one.
              </td>
            </tr>
          )}
          {ideas.map((idea) => (
            <tr
              key={idea.id}
              onClick={() => router.push(`/ideas/view?id=${idea.id}`)}
              className={cn(
                'cursor-pointer border-b border-border/40 last:border-0',
                'hover:bg-muted/40 transition-colors',
              )}
            >
              <td className="px-3 py-2.5 font-medium">{idea.title}</td>
              <td className="px-3 py-2.5">
                <IdeaStatusChip status={idea.status} />
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {idea.tags.slice(0, 3).join(', ')}
                {idea.tags.length > 3 && ` +${idea.tags.length - 3}`}
              </td>
              <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                {new Date(idea.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
