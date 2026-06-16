'use client';

import { useRouter } from 'next/navigation';
import { CirclePile } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { SelectableIcon } from '@/components/selectable-icon';
import { cn } from '@/lib/utils';

/**
 * Table layout for the Councils page: one row per council with a leading select
 * cell, then name, description, provider logos and participant count. Rows
 * navigate to the council detail on click — mirroring the cards in the
 * list/grid views — except clicks on the select icon, which toggle selection.
 */
export function CouncilTable({
  councils,
  isSelected,
  onToggleSelect,
}: {
  councils: Council[];
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
}) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
            <th className="w-8 px-3 py-2 font-medium"></th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Participants</th>
            <th className="px-3 py-2 text-right font-medium">Count</th>
          </tr>
        </thead>
        <tbody>
          {councils.map((council) => {
            const providers = [...new Set(council.participants.map((p) => p.provider))];
            const selected = isSelected?.(council.id) ?? false;
            return (
              <tr
                key={council.id}
                onClick={() => router.push(`/councils/${council.id}`)}
                className={cn(
                  'cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-accent/40',
                  selected && 'bg-accent/30',
                  council.archived && 'opacity-60',
                )}
              >
                <td className="px-3 py-2">
                  <SelectableIcon
                    Icon={CirclePile}
                    selected={selected}
                    onToggle={(sk) => onToggleSelect?.(council.id, sk)}
                  />
                </td>
                <td className="px-3 py-2 font-medium">{council.name}</td>
                <td className="max-w-md px-3 py-2 text-muted-foreground">
                  <span className="line-clamp-1">{council.description ?? '—'}</span>
                </td>
                <td className="px-3 py-2">
                  {providers.length > 0 ? (
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
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {council.participants.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
