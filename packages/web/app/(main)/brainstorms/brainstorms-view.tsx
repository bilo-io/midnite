'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain, LayoutGrid, List, ListTree, Plus, type LucideIcon } from 'lucide-react';
import type { Brainstorm } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { BrainstormCard } from '@/components/brainstorm-card';
import { BrainstormTable } from '@/components/brainstorm-table';
import { BrainstormCreateModal } from '@/components/brainstorm-create-modal';
import { deleteBrainstorm, updateBrainstorm } from '@/lib/api';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.brainstorms.view';
const VIEW_OPTIONS: Array<{ value: View; label: string; Icon: LucideIcon }> = [
  { value: 'list', label: 'List view', Icon: List },
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'table', label: 'Table view', Icon: ListTree },
];

export function BrainstormsView({ initial }: { initial: Brainstorm[] }) {
  const router = useRouter();
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

  const refresh = useCallback(() => router.refresh(), [router]);

  // --- Bulk selection ---
  const confirm = useConfirm();
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();

  const selectedBrainstorms = useMemo(
    () => initial.filter((b) => selectedIds.includes(b.id)),
    [initial, selectedIds],
  );

  const setArchivedFor = useCallback(
    async (ids: string[], archived: boolean) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => updateBrainstorm(id, { archived })));
      clearSelection();
      refresh();
    },
    [clearSelection, refresh],
  );

  const deleteSelection = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} brainstorm${selectedIds.length === 1 ? '' : 's'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteBrainstorm(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedBrainstorms.filter((b) => !b.archived).map((b) => b.id);
    const toUnarchive = selectedBrainstorms.filter((b) => b.archived).map((b) => b.id);
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
  }, [selectedBrainstorms, setArchivedFor, deleteSelection]);

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((b) =>
        [b.name, b.description ?? '', ...b.contributors.map((c) => c.name)].some((f) =>
          f.toLowerCase().includes(q),
        ),
      )
    : initial;

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} brainstorm{filtered.length === 1 ? '' : 's'}
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
            New brainstorm
          </Button>
        </div>
      </div>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={Brain}
            title="No brainstorms yet"
            description="Create one, add contributors with distinct lenses, and put a challenge to them."
            actionLabel="New brainstorm"
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Brain} title={`No brainstorms match “${q}”`} />
        ) : view === 'table' ? (
          <BrainstormTable
            brainstorms={filtered}
            isSelected={isSelected}
            onToggleSelect={(id, sk) => toggleSelect(id, sk, filtered.map((x) => x.id))}
          />
        ) : view === 'list' ? (
          <div className="flex flex-col gap-2">
            {filtered.map((b) => (
              <BrainstormCard
                key={b.id}
                brainstorm={b}
                layout="list"
                selected={isSelected(b.id)}
                onToggleSelect={() => toggleSelect(b.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((b) => (
              <BrainstormCard
                key={b.id}
                brainstorm={b}
                layout="grid"
                selected={isSelected(b.id)}
                onToggleSelect={() => toggleSelect(b.id)}
              />
            ))}
          </div>
        )}
      </div>

      {creating ? <BrainstormCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
