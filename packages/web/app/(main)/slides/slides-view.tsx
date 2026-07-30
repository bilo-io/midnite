'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus, Presentation, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Project } from '@midnite/shared';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { CountPill } from '@/components/count-pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ProjectTag } from '@/components/project-tag';
import { SearchBar } from '@/components/search-bar';
import { SortSelect } from '@/components/sort-select';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { useToast } from '@/components/toast';
import { DeckCard, DeckRow } from '@/components/slides/deck-card';
import { projectPageHref } from '@/lib/project-route';
import { deleteDeck, duplicateDeck, type DeckSummary } from '@/lib/slides/store';
import { groupDecksByProject } from '@/lib/slides/group-by-project';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { useDecks } from '@/lib/slides/use-decks';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useProjectFilterStore } from '@/lib/project-filter-store';
import { cn } from '@/lib/utils';

type View = 'grid' | 'list';
const VIEW_OPTIONS: Array<{ value: View; Icon: LucideIcon }> = [
  { value: 'grid', Icon: LayoutGrid },
  { value: 'list', Icon: List },
];

type Sort = 'recent' | 'oldest' | 'title' | 'title-desc' | 'updated' | 'count';
const SORT_VALUES: readonly Sort[] = ['recent', 'oldest', 'title', 'title-desc', 'updated', 'count'];

// Special project-filter value matching decks with no project assigned.
const UNASSIGNED = 'none';

export function SlidesView({ projects = [] }: { projects?: Project[] }) {
  const t = useTranslations('slides');
  const tc = useTranslations('common');
  const { decks, hydrated, refresh } = useDecks();
  const [view, setView] = useLocalStorage<View>('midnite.slides.view', 'grid');
  const [sort, setSort] = useLocalStorage<Sort>('midnite.slides.sort', 'recent');

  // Search (`?q=`) is URL-backed so the control-bar SearchBar is the source of
  // truth, consistent with the other list pages. The project filter is the
  // global titlebar selection (Phase 81+) instead — shared across every
  // project-aware view rather than this page's own `?project=` param.
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const validProjects = useMemo(
    () => new Set([...projects.map((p) => p.id), UNASSIGNED]),
    [projects],
  );
  const globalProjectSelection = useProjectFilterStore((s) => s.selected);
  const activeProjects = useMemo(
    () => new Set(globalProjectSelection.filter((p) => validProjects.has(p))),
    [globalProjectSelection, validProjects],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = decks
      .filter((d) => activeProjects.size === 0 || activeProjects.has(d.projectId ?? UNASSIGNED))
      .filter((d) => {
        if (!q) return true;
        if (d.title.toLowerCase().includes(q) || String(d.id).includes(q)) return true;
        const project = d.projectId ? projectsById.get(d.projectId) : null;
        return !!project && project.tag.toLowerCase().includes(q);
      });
    const sorted = [...list];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => (a.created < b.created ? -1 : a.created > b.created ? 1 : 0));
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'updated':
        sorted.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
        break;
      case 'count':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
        break;
    }
    return sorted;
  }, [decks, query, sort, activeProjects, projectsById]);

  // --- Bulk selection (decks are keyed by slug) ---
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();
  const confirm = useConfirm();
  const toast = useToast();
  const orderedSlugs = useMemo(() => filtered.map((d) => d.slug), [filtered]);

  const duplicateSelection = useCallback(() => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((slug) => duplicateDeck(slug));
    toast.success(t('list.bulk.duplicated', { count: selectedIds.length }));
    clearSelection();
    refresh();
  }, [selectedIds, toast, clearSelection, refresh, t]);

  const deleteSelection = useCallback(async () => {
    const slugs = [...selectedIds];
    if (slugs.length === 0) return;
    const ok = await confirm({
      title: t('list.bulk.deleteTitle', { count: slugs.length }),
      description: t('list.bulk.deleteDescription'),
      confirmLabel: tc('delete'),
    });
    if (!ok) return;
    slugs.forEach((slug) => deleteDeck(slug));
    toast.success(t('list.bulk.deleted', { count: slugs.length }));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, toast, clearSelection, refresh, t, tc]);

  const bulkActions: BulkAction[] = [
    { key: 'duplicate', label: t('list.bulk.duplicate'), color: BULK_COLORS.neutral, onClick: duplicateSelection },
    { key: 'delete', label: tc('delete'), color: BULK_COLORS.delete, onClick: () => void deleteSelection() },
  ];

  // Avoid flashing the empty state before localStorage has been read.
  if (!hydrated) return <div className="h-40" aria-hidden />;

  if (decks.length === 0) {
    return (
      <EmptyState
        Icon={Presentation}
        title={t('list.empty.title')}
        description={t('list.empty.description')}
        action={
          <Link href="/slides/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4" />
            {t('list.newDeck')}
          </Link>
        }
      />
    );
  }

  const filtering = query.trim() !== '' || activeProjects.size > 0;

  return (
    <div className="space-y-4">
      <StickyToolbar>
        <div className="flex flex-wrap items-center gap-2">
          <SortSelect<Sort>
            options={SORT_VALUES.map((value) => ({ value, label: t(`list.sort.${value}`) }))}
            value={sort}
            onChange={setSort}
            aria-label={t('list.sortLabel')}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SearchBar placeholder={t('list.searchPlaceholder')} />
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            {VIEW_OPTIONS.map(({ value, Icon }) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t(`list.view.${value}`)}
                aria-pressed={view === value}
                onClick={() => setView(value)}
                className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Link href="/slides/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4" />
            {t('list.newDeck')}
          </Link>
        </div>
      </StickyToolbar>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <CountPill count={decks.length} />
        {filtering && filtered.length !== decks.length ? (
          <span>· {t('list.matching', { count: filtered.length })}</span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {t('list.noMatches')}
        </div>
      ) : view === 'list' ? (
        <ProjectGroupedDecks
          decks={filtered}
          projects={projects}
          onChanged={refresh}
          isSelected={isSelected}
          onToggleSelect={(slug, shiftKey) => toggleSelect(slug, shiftKey, orderedSlugs)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.slug}
              deck={deck}
              project={deck.projectId ? projectsById.get(deck.projectId) : undefined}
              onChanged={refresh}
              selected={isSelected(deck.slug)}
              onToggleSelect={(sk) => toggleSelect(deck.slug, sk, orderedSlugs)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * List-view body: decks grouped under reorderable, collapsible per-project
 * accordions — mirroring the Tasks list view. Each row skips its own project
 * tag (the group header already carries it) since every deck in a section
 * belongs to the same project.
 */
function ProjectGroupedDecks({
  decks,
  projects,
  onChanged,
  isSelected,
  onToggleSelect,
}: {
  decks: DeckSummary[];
  projects: Project[];
  onChanged: () => void;
  isSelected: (slug: string) => boolean;
  onToggleSelect: (slug: string, shiftKey: boolean) => void;
}) {
  const t = useTranslations('slides');
  const groups = groupDecksByProject(decks, projects, t('list.unassigned'));

  const sections: AccordionSection[] = groups.map((g) => ({
    id: g.key,
    label: g.projectId ? (
      <Link href={projectPageHref(g.projectId)} onClick={(e) => e.stopPropagation()} className="hover:underline">
        {g.name}
      </Link>
    ) : (
      g.name
    ),
    color: g.color,
    leading: g.projectId && g.tag ? <ProjectTag tag={g.tag} color={g.color ?? '#94a3b8'} /> : undefined,
    count: g.decks.length,
    summary: t('list.groupSummary', { count: g.decks.length }),
    body: (
      <div className="flex flex-col gap-2 pt-1">
        {g.decks.map((deck) => (
          <DeckRow
            key={deck.slug}
            deck={deck}
            onChanged={onChanged}
            selected={isSelected(deck.slug)}
            onToggleSelect={(sk) => onToggleSelect(deck.slug, sk)}
          />
        ))}
      </div>
    ),
  }));

  return (
    <div className="min-h-0 flex-1 pb-1">
      <SortableAccordions sections={sections} storageKey="midnite.slides.listGroups" variant="bare" />
    </div>
  );
}
