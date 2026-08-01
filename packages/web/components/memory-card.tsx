'use client';

import { BrainCircuit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Memory, Project } from '@midnite/shared';
import { MemoryScopeChip } from '@/components/memory/memory-scope';
import { SelectableIcon } from '@/components/selectable-icon';
import { useLocaleFormat } from '@/lib/use-locale-format';
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

export function MemoryCard({
  memory,
  project,
  layout,
  onOpen,
  selected = false,
  onToggleSelect,
}: Props) {
  const t = useTranslations('memory');
  const { dateTime } = useLocaleFormat();

  // Locale-aware "last updated" date (Phase 82) — an unparseable timestamp renders nothing.
  const updated = (() => {
    const d = new Date(memory.updatedAt);
    return Number.isNaN(d.getTime()) ? '' : dateTime(d);
  })();

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
      {t('list.card.archived')}
    </span>
  ) : null;

  if (layout === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 transition-colors hover:border-foreground/20',
          selected && 'border-primary/50 bg-accent/30',
          memory.archived && 'opacity-80',
        )}
      >
        {selectIcon}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <MemoryScopeChip project={project} />
            {archivedBadge}
            <span className="truncate text-sm font-medium">{memory.title}</span>
          </div>
          {excerpt ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{excerpt}</p>
          ) : null}
        </button>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{updated}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 transition-colors hover:border-foreground/20',
        selected && 'border-primary/50 bg-accent/30',
        memory.archived && 'opacity-80',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {selectIcon}
          <MemoryScopeChip project={project} />
          {archivedBadge}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{updated}</span>
      </div>
      <button type="button" onClick={onOpen} className="flex flex-col gap-3 text-left">
        <span className="line-clamp-1 text-sm font-medium leading-snug">{memory.title}</span>
        <p className="line-clamp-2 min-h-8 text-xs text-muted-foreground">{excerpt}</p>
      </button>
    </div>
  );
}
