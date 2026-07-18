'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Plus, Presentation, type LucideIcon } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { CountPill } from '@/components/count-pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { StyledSelect } from '@/components/ui/styled-select';
import { EmptyState } from '@/components/empty-state';
import type { FilterOption } from '@/components/filter-pills';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import { SearchBar } from '@/components/search-bar';
import { DeckCard, DeckRow } from '@/components/slides/deck-card';
import { useDecks } from '@/lib/slides/use-decks';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

type View = 'grid' | 'list';
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'list', label: 'List view', Icon: List },
];

type Sort = 'recent' | 'oldest' | 'title' | 'title-desc' | 'updated' | 'count';
const SORT_OPTIONS: ReadonlyArray<{ value: Sort; label: string }> = [
  { value: 'recent', label: 'Most recent' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'count', label: 'Most slides' },
];

// Special project-filter value matching decks with no project assigned.
const UNASSIGNED = 'none';

export function SlidesView({ projects = [] }: { projects?: Project[] }) {
  const { decks, hydrated, refresh } = useDecks();
  const [view, setView] = useLocalStorage<View>('midnite.slides.view', 'grid');
  const [sort, setSort] = useLocalStorage<Sort>('midnite.slides.sort', 'recent');

  // Search (`?q=`) and project filter (`?project=`) are URL-backed so the
  // control-bar SearchBar and the ProjectMultiSelect are the source of truth —
  // consistent with the other list pages.
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  const projectFilters: FilterOption[] = useMemo(
    () => [
      { value: UNASSIGNED, label: 'Unassigned', color: '#94a3b8' },
      ...projects.map((p) => ({ value: p.id, label: p.tag, color: p.color })),
    ],
    [projects],
  );

  const validProjects = useMemo(
    () => new Set([...projects.map((p) => p.id), UNASSIGNED]),
    [projects],
  );
  const rawProject = searchParams.get('project');
  const activeProjects = useMemo(
    () => new Set((rawProject ? rawProject.split(',') : []).filter((p) => validProjects.has(p))),
    [rawProject, validProjects],
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

  // Avoid flashing the empty state before localStorage has been read.
  if (!hydrated) return <div className="h-40" aria-hidden />;

  if (decks.length === 0) {
    return (
      <EmptyState
        Icon={Presentation}
        title="No decks yet"
        description="Create a deck by pasting Markdown — headings become slides and each point types itself in as you present."
        action={
          <Link href="/slides/new" className={cn(buttonVariants({ size: 'sm' }))}>
            <Plus className="h-4 w-4" />
            New deck
          </Link>
        }
      />
    );
  }

  const filtering = query.trim() !== '' || activeProjects.size > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {projects.length > 0 && <ProjectMultiSelect options={projectFilters} />}

        <StyledSelect<Sort>
          options={SORT_OPTIONS}
          value={sort}
          onChange={setSort}
          aria-label="Sort decks"
          className="w-44"
        />

        <div className="ml-auto">
          <SearchBar placeholder="Search decks" />
        </div>

        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
          {VIEW_OPTIONS.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={label}
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
          New deck
        </Link>
      </div>

      <div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
        <CountPill count={decks.length} noun="deck" />
        {filtering && filtered.length !== decks.length ? (
          <span>· {filtered.length} matching</span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/20 px-6 py-12 text-center text-sm text-muted-foreground">
          No decks match the current filters.
        </div>
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {filtered.map((deck) => (
            <DeckRow
              key={deck.slug}
              deck={deck}
              project={deck.projectId ? projectsById.get(deck.projectId) : undefined}
              onChanged={refresh}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((deck) => (
            <DeckCard
              key={deck.slug}
              deck={deck}
              project={deck.projectId ? projectsById.get(deck.projectId) : undefined}
              onChanged={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
