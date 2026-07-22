'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrainCircuit, LayoutGrid, List, ListTree, Plus } from 'lucide-react';
import type { Memory, Project } from '@midnite/shared';
import { CountPill } from '@/components/count-pill';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { MemoryCard } from '@/components/memory-card';
import { MemoriesTree } from '@/components/memories-tree';
import { MemoryModal } from '@/components/memory-modal';
import { SearchBar } from '@/components/search-bar';
import { deleteMemory, updateMemory } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { memoryPageHref } from '@/lib/memory-route';
import { useBulkSelection } from '@/lib/use-bulk-selection';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.memory.view';

/** The scope pill for global memories — violet, to match the brain. */
const GLOBAL_HUE = '262 83% 66%';
const GLOBAL_SCOPE = 'global';

export function MemoryView({ initial, projects }: { initial: Memory[]; projects: Project[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>('grid');
  const [creating, setCreating] = useState(false);
  // Scope to preselect when creating from a `?create=<id>` deep link (e.g. the
  // project modal's "create a memory" link). null = global.
  const [createScope, setCreateScope] = useState<string | null>(null);
  // Opening an existing memory navigates to its workspace page (Phase 65 A);
  // the modal is reserved for creating a new one.
  const openMemory = useCallback((id: string) => router.push(memoryPageHref(id)), [router]);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, []);

  const refresh = useCallback(() => invalidateData(), []);

  // --- Bulk selection ---
  const confirm = useConfirm();
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();

  const selectedMemories = useMemo(
    () => initial.filter((m) => selectedIds.includes(m.id)),
    [initial, selectedIds],
  );

  const setArchivedFor = useCallback(
    async (ids: string[], archived: boolean) => {
      if (ids.length === 0) return;
      const verb = archived ? 'Archive' : 'Unarchive';
      const ok = await confirm({
        title: `${verb} ${ids.length} memor${ids.length === 1 ? 'y' : 'ies'}?`,
        description: archived
          ? 'They’ll be hidden from your active memories — you can unarchive them any time.'
          : 'They’ll return to your active memories.',
        confirmLabel: verb,
        destructive: false,
      });
      if (!ok) return;
      await Promise.all(ids.map((id) => updateMemory(id, { archived })));
      clearSelection();
      refresh();
    },
    [confirm, clearSelection, refresh],
  );

  const deleteSelection = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} memor${selectedIds.length === 1 ? 'y' : 'ies'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteMemory(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedMemories.filter((m) => !m.archived).map((m) => m.id);
    const toUnarchive = selectedMemories.filter((m) => m.archived).map((m) => m.id);
    if (toArchive.length) {
      actions.push({
        key: 'archive',
        label: 'Archive',
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toArchive, true),
      });
    }
    if (toUnarchive.length) {
      actions.push({
        key: 'unarchive',
        label: 'Unarchive',
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toUnarchive, false),
      });
    }
    actions.push({
      key: 'delete',
      label: 'Delete',
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelection(),
    });
    return actions;
  }, [selectedMemories, setArchivedFor, deleteSelection]);

  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Only offer pills for scopes that exist: Global plus projects that hold at
  // least one memory (an all-projects list would crowd the row for nothing).
  const scopeOptions: FilterOption[] = [
    { value: GLOBAL_SCOPE, label: 'Global', hue: GLOBAL_HUE },
    ...projects
      .filter((p) => initial.some((m) => m.projectId === p.id))
      .map((p) => ({ value: p.id, label: p.name, color: p.color })),
  ];

  const searchParams = useSearchParams();

  // A `?create=<id>` deep link opens the create modal pre-scoped, then strips
  // the param so a refresh/back doesn't reopen it.
  const createParam = searchParams.get('create');
  useEffect(() => {
    if (createParam === null) return;
    setCreating(true);
    setCreateScope(createParam === GLOBAL_SCOPE ? null : createParam);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.delete('create');
    router.replace(`/memory${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }, [createParam, searchParams, router]);

  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const scopeRaw = searchParams.get('scope');
  const valid = new Set(scopeOptions.map((o) => o.value));
  const scopes = new Set((scopeRaw ? scopeRaw.split(',') : []).filter((v) => valid.has(v)));

  const filtered = initial.filter((m) => {
    if (scopes.size > 0 && !scopes.has(m.projectId ?? GLOBAL_SCOPE)) return false;
    if (!q) return true;
    const projectName = m.projectId ? projectById.get(m.projectId)?.name ?? '' : 'global';
    return [m.title, m.content, projectName].some((f) => f.toLowerCase().includes(q));
  });

  const closeModal = useCallback(() => {
    setCreating(false);
    setCreateScope(null);
  }, []);

  return (
    <div className="space-y-4" data-tour="memory-workspace">
      <StickyToolbar className="reveal-controls">
        <div className="flex min-w-0 items-center gap-3">
          <CountPill count={filtered.length} noun="memory" />
          <FilterPills options={scopeOptions} paramKey="scope" allLabel="All scopes" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SearchBar placeholder="Search memories" />
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={view === 'list' ? 'h-7 w-7 bg-accent text-accent-foreground' : 'h-7 w-7'}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => onSetView('grid')}
              className={view === 'grid' ? 'h-7 w-7 bg-accent text-accent-foreground' : 'h-7 w-7'}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Table view"
              aria-pressed={view === 'table'}
              onClick={() => onSetView('table')}
              className={view === 'table' ? 'h-7 w-7 bg-accent text-accent-foreground' : 'h-7 w-7'}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New memory
          </Button>
        </div>
      </StickyToolbar>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={BrainCircuit}
            title="No memories yet"
            description="Write down conventions, context and decisions your agents should never forget."
            actionLabel="New memory"
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            Icon={BrainCircuit}
            title={`No memories match${q ? ` “${q}”` : ' the current filters'}`}
          />
        ) : view === 'table' ? (
          <MemoriesTree
            memories={filtered}
            projects={projects}
            onOpen={(id) => openMemory(id)}
            isSelected={isSelected}
            onToggleSelect={(id, sk) => toggleSelect(id, sk, filtered.map((x) => x.id))}
          />
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                project={m.projectId ? projectById.get(m.projectId) : undefined}
                layout="grid"
                onOpen={() => openMemory(m.id)}
                selected={isSelected(m.id)}
                onToggleSelect={(sk) => toggleSelect(m.id, sk, filtered.map((x) => x.id))}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((m) => (
              <MemoryCard
                key={m.id}
                memory={m}
                project={m.projectId ? projectById.get(m.projectId) : undefined}
                layout="list"
                onOpen={() => openMemory(m.id)}
                selected={isSelected(m.id)}
                onToggleSelect={(sk) => toggleSelect(m.id, sk, filtered.map((x) => x.id))}
              />
            ))}
          </div>
        )}
      </div>

      {creating ? (
        <MemoryModal
          projects={projects}
          initialProjectId={createScope}
          onClose={closeModal}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
