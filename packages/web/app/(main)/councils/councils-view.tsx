'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CirclePile, LayoutGrid, List, ListTree, Plus, type LucideIcon } from 'lucide-react';
import type { Council } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { CouncilCard } from '@/components/council-card';
import { CouncilTable } from '@/components/council-table';
import { CouncilCreateModal } from '@/components/council-create-modal';
import { deleteCouncil, updateCouncil } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.councils.view';
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'table', label: 'Table view', Icon: ListTree },
];

export function CouncilsView({ initial }: { initial: Council[] }) {
  const [view, setView] = useState<View>('grid');
  const [creating, setCreating] = useState(false);

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

  const selectedCouncils = useMemo(
    () => initial.filter((c) => selectedIds.includes(c.id)),
    [initial, selectedIds],
  );

  const setArchivedFor = useCallback(
    async (ids: string[], archived: boolean) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => updateCouncil(id, { archived })));
      clearSelection();
      refresh();
    },
    [clearSelection, refresh],
  );

  const deleteSelection = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} council${selectedIds.length === 1 ? '' : 's'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteCouncil(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedCouncils.filter((c) => !c.archived).map((c) => c.id);
    const toUnarchive = selectedCouncils.filter((c) => c.archived).map((c) => c.id);
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
  }, [selectedCouncils, setArchivedFor, deleteSelection]);

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((c) =>
        [c.name, c.description ?? '', ...c.participants.map((p) => p.name)].some((f) =>
          f.toLowerCase().includes(q),
        ),
      )
    : initial;

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} council{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            {VIEW_OPTIONS.map(({ value, label, Icon }) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => onSetView(value)}
                className={cn('h-7 w-7', view === value && 'bg-accent text-accent-foreground')}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New council
          </Button>
        </div>
      </div>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={CirclePile}
            title="No councils yet"
            description="Create one, add participants with distinct perspectives, and put a topic to them."
            actionLabel="New council"
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={CirclePile} title={`No councils match “${q}”`} />
        ) : view === 'table' ? (
          <CouncilTable
            councils={filtered}
            isSelected={isSelected}
            onToggleSelect={(id, sk) => toggleSelect(id, sk, filtered.map((x) => x.id))}
          />
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <CouncilCard
                key={c.id}
                council={c}
                layout="list"
                selected={isSelected(c.id)}
                onToggleSelect={() => toggleSelect(c.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c) => (
              <CouncilCard
                key={c.id}
                council={c}
                layout="grid"
                selected={isSelected(c.id)}
                onToggleSelect={() => toggleSelect(c.id)}
              />
            ))}
          </div>
        )}
      </div>

      {creating ? <CouncilCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
