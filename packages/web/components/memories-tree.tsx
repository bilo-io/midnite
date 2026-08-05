'use client';

import { BrainCircuit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Memory, Project } from '@midnite/shared';
import { ProjectNameLink } from '@/components/project-name-link';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { cn } from '@/lib/utils';

/** Matches MemoryView's GLOBAL scope id and violet hue. */
const GLOBAL_SCOPE = 'global';
const GLOBAL_HUE = '262 83% 66%';

function excerptOf(content: string): string {
  return (
    content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#')) ?? ''
  );
}

function MemoryRow({
  memory,
  onOpen,
  selected,
  onToggleSelect,
}: {
  memory: Memory;
  onOpen: () => void;
  selected: boolean;
  onToggleSelect: (shiftKey: boolean) => void;
}) {
  const t = useTranslations('memory');
  const excerpt = excerptOf(memory.content);
  return (
    <div
      className={cn(
        'group flex items-center gap-3 border-b border-border/40 px-3 py-2 transition-colors last:border-b-0 hover:bg-accent/40',
        selected && 'bg-accent/30',
        memory.archived && 'opacity-60',
      )}
    >
      <SelectableIcon Icon={BrainCircuit} selected={selected} onToggle={onToggleSelect} />
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{memory.title}</span>
          {memory.archived ? (
            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('list.card.archived')}
            </span>
          ) : null}
        </div>
        {excerpt ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{excerpt}</p>
        ) : null}
      </button>
      {memory.sources.length > 0 ? (
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {t('tree.sourceCount', { count: memory.sources.length })}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Tree layout for the Memory page: each scope (Global, then each project that
 * holds memories) is a collapsible, drag-reorderable accordion whose children are
 * its memory rows. Mirrors ProjectsTree.
 */
export function MemoriesTree({
  memories,
  projects,
  onOpen,
  isSelected,
  onToggleSelect,
}: {
  memories: Memory[];
  projects: Project[];
  onOpen: (id: string) => void;
  isSelected: (id: string) => boolean;
  onToggleSelect: (id: string, shiftKey: boolean) => void;
}) {
  const t = useTranslations('memory');
  const rowsFor = (items: Memory[]) =>
    items.length === 0 ? (
      <div className="px-4 py-3 text-xs text-muted-foreground">{t('tree.empty')}</div>
    ) : (
      items.map((m) => (
        <MemoryRow
          key={m.id}
          memory={m}
          onOpen={() => onOpen(m.id)}
          selected={isSelected(m.id)}
          onToggleSelect={(sk) => onToggleSelect(m.id, sk)}
        />
      ))
    );

  const sections: AccordionSection[] = [];

  const globalMemories = memories.filter((m) => !m.projectId);
  if (globalMemories.length > 0) {
    sections.push({
      id: GLOBAL_SCOPE,
      label: t('scope.global'),
      hue: GLOBAL_HUE,
      count: globalMemories.length,
      summary: t('tree.memoryCount', { count: globalMemories.length }),
      body: rowsFor(globalMemories),
    });
  }

  for (const p of projects) {
    const items = memories.filter((m) => m.projectId === p.id);
    if (items.length === 0) continue;
    sections.push({
      id: p.id,
      label: <ProjectNameLink projectId={p.id} name={p.name} />,
      color: p.color,
      count: items.length,
      summary: t('tree.memoryCount', { count: items.length }),
      body: rowsFor(items),
    });
  }

  return <SortableAccordions sections={sections} storageKey="midnite.memory.tree" variant="split" />;
}
