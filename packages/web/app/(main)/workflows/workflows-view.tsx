'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, ListTree, Plus, Workflow } from 'lucide-react';
import type { WorkflowSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { CollapsibleStatusGroups, type StatusGroup } from '@/components/collapsible-status-groups';
import { WindowVirtualList } from '@/components/ui/window-virtual-list';
import { WorkflowCard } from '@/components/workflow-card';
import { WorkflowsTable, TRIGGER_SECTIONS } from '@/components/workflows-table';
import { WorkflowCreateModal } from '@/components/workflow-create-modal';
import { deleteWorkflow, duplicateWorkflow, updateWorkflow } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useBulkSelection } from '@/lib/use-bulk-selection';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.workflows.view';

export function WorkflowsView({ initial }: { initial: WorkflowSummary[] }) {
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

  const selectedWorkflows = useMemo(
    () => initial.filter((w) => selectedIds.includes(w.id)),
    [initial, selectedIds],
  );

  const setArchivedFor = useCallback(
    async (ids: string[], archived: boolean) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => updateWorkflow(id, { archived })));
      clearSelection();
      refresh();
    },
    [clearSelection, refresh],
  );

  const deleteSelection = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.length} workflow${selectedIds.length === 1 ? '' : 's'}?`,
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteWorkflow(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh]);

  const duplicateOne = useCallback(async (id: string) => {
    await duplicateWorkflow(id);
    refresh();
  }, [refresh]);

  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedWorkflows.filter((w) => !w.archived).map((w) => w.id);
    const toUnarchive = selectedWorkflows.filter((w) => w.archived).map((w) => w.id);
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
  }, [selectedWorkflows, setArchivedFor, deleteSelection]);

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((w) => [w.name, w.description ?? ''].some((f) => f.toLowerCase().includes(q)))
    : initial;

  // Group the grid/list views by trigger type into reorderable accordions,
  // mirroring the table view (and the sessions list/grid).
  const triggerGroups = (layout: 'list' | 'grid'): StatusGroup[] =>
    TRIGGER_SECTIONS.map(({ type, label, hue }) => {
      const items = filtered.filter((w) => w.triggerType === type);
      return {
        id: `trigger-${type}`,
        label,
        hue,
        count: items.length,
        body:
          items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No {label.toLowerCase()} workflows</p>
          ) : layout === 'list' ? (
            <WindowVirtualList
              items={items}
              gap={8}
              rowKey={(w) => w.id}
              renderRow={(w) => (
                <WorkflowCard
                  workflow={w}
                  layout="list"
                  selected={isSelected(w.id)}
                  onToggleSelect={() => toggleSelect(w.id)}
                  onDuplicate={() => void duplicateOne(w.id)}
                />
              )}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((w) => (
                <WorkflowCard
                  key={w.id}
                  workflow={w}
                  layout="grid"
                  selected={isSelected(w.id)}
                  onToggleSelect={() => toggleSelect(w.id)}
                  onDuplicate={() => void duplicateOne(w.id)}
                />
              ))}
            </div>
          ),
      };
    });

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex flex-wrap items-center justify-between gap-3 gap-y-2">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} workflow{filtered.length === 1 ? '' : 's'}
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => onSetView('list')}
              className={cn('h-7 w-7', view === 'list' && 'bg-accent text-accent-foreground')}
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
              className={cn('h-7 w-7', view === 'grid' && 'bg-accent text-accent-foreground')}
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
              className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </div>
      </div>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={Workflow}
            title="No workflows yet"
            description="Build an automation that runs on a schedule, a webhook, or on demand."
            actionLabel="New workflow"
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Workflow} title={`No workflows match “${q}”`} />
        ) : view === 'table' ? (
          <WorkflowsTable
            workflows={filtered}
            isSelected={isSelected}
            onToggleSelect={(id, sk) => toggleSelect(id, sk, filtered.map((x) => x.id))}
          />
        ) : view === 'list' ? (
          <CollapsibleStatusGroups
            groups={triggerGroups('list')}
            storageKey="midnite.workflows.listGroups"
          />
        ) : (
          <CollapsibleStatusGroups
            groups={triggerGroups('grid')}
            storageKey="midnite.workflows.gridGroups"
          />
        )}
      </div>

      {creating ? <WorkflowCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
