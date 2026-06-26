'use client';

import { Brain, BrainCircuit } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import { cn } from '@/lib/utils';

type Props = {
  memory: Memory;
  /** Resolved project for project-scoped memories; undefined = global. */
  project?: Project;
  layout: 'list' | 'grid';
  onOpen: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
};

/** The scope chip: the project's tag, or a violet "Global" chip for shared memories. */
function ScopeChip({ project }: { project?: Project }) {
  if (project) return <ProjectTag tag={project.tag} color={project.color} />;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[hsl(262_83%_66%/0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(262_83%_72%)]">
      <Brain className="h-3 w-3" />
      Global
    </span>
  );
}

function updatedLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

export function MemoryCard({
  memory,
  project,
  layout,
  onOpen,
  selected = false,
  onToggleSelect,
}: Props) {
  // First non-heading content line as the excerpt, so a "# Title" doesn't repeat the card title.
  const excerpt =
    memory.content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#')) ?? '';

  const selectIcon = (
    <SelectableIcon Icon={BrainCircuit} selected={selected} onToggle={(sk) => onToggleSelect?.(sk)} />
  );

  const archivedBadge = memory.archived ? (
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
          memory.archived && 'opacity-80',
        )}
      >
        {selectIcon}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <ScopeChip project={project} />
            {archivedBadge}
            <span className="truncate text-sm font-medium">{memory.title}</span>
          </div>
          {excerpt ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{excerpt}</p>
          ) : null}
        </button>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {updatedLabel(memory.updatedAt)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40',
        selected && 'border-primary/50 bg-accent/30',
        memory.archived && 'opacity-80',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {selectIcon}
          <ScopeChip project={project} />
          {archivedBadge}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {updatedLabel(memory.updatedAt)}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="flex flex-col gap-3 text-left">
        <span className="line-clamp-1 text-sm font-medium leading-snug">{memory.title}</span>
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">{excerpt}</p>
      </button>
    </div>
  );
}
