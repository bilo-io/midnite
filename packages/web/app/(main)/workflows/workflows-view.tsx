'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutDashboard, LayoutGrid, List, ListTree, Plus, Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { WorkflowSummary } from '@midnite/shared';
import { CountPill } from '@/components/count-pill';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { Button } from '@/components/ui/button';
import { HoverExpandButton } from '@/components/hover-expand-button';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { EmptyState } from '@/components/empty-state';
import { useConfirm } from '@/components/confirm-dialog';
import { CollapsibleStatusGroups, type StatusGroup } from '@/components/collapsible-status-groups';
import { SearchBar } from '@/components/search-bar';
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
  const t = useTranslations('workflows');
  const tc = useTranslations('common');
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
      title: t('list.bulk.deleteTitle', { count: selectedIds.length }),
      description: t('list.bulk.deleteDescription'),
      confirmLabel: tc('delete'),
    });
    if (!ok) return;
    await Promise.all(selectedIds.map((id) => deleteWorkflow(id)));
    clearSelection();
    refresh();
  }, [selectedIds, confirm, clearSelection, refresh, t, tc]);

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
        label: t('list.bulk.archive'),
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toArchive, true),
      });
    }
    if (toUnarchive.length) {
      actions.push({
        key: 'unarchive',
        label: t('list.bulk.unarchive'),
        color: BULK_COLORS.archive,
        onClick: () => void setArchivedFor(toUnarchive, false),
      });
    }
    actions.push({
      key: 'delete',
      label: tc('delete'),
      color: BULK_COLORS.delete,
      onClick: () => void deleteSelection(),
    });
    return actions;
  }, [selectedWorkflows, setArchivedFor, deleteSelection, t, tc]);

  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((w) => [w.name, w.description ?? ''].some((f) => f.toLowerCase().includes(q)))
    : initial;

  // Group the grid/list views by trigger type into reorderable accordions,
  // mirroring the table view (and the sessions list/grid).
  const triggerGroups = (layout: 'list' | 'grid'): StatusGroup[] =>
    TRIGGER_SECTIONS.map(({ type, hue }) => {
      const label = t(`list.triggers.${type}`);
      const items = filtered.filter((w) => w.triggerType === type);
      return {
        id: `trigger-${type}`,
        label,
        hue,
        count: items.length,
        body:
          items.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('list.noneForTrigger', { trigger: label.toLowerCase() })}
            </p>
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
      <StickyToolbar className="reveal-controls">
        <CountPill count={filtered.length} />
        <div className="flex items-center gap-2">
          {/* Templates — icon-only left of search, revealing its label on hover
              (the shared HoverExpandButton pattern, as on the tasks board). */}
          <HoverExpandButton
            href="/workflows/templates"
            icon={<LayoutDashboard className="h-3.5 w-3.5" />}
            label={t('list.templates')}
            variant="outline"
          />
          <SearchBar placeholder={t('list.searchPlaceholder')} />
          <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('list.view.list')}
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
              aria-label={t('list.view.grid')}
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
              aria-label={t('list.view.table')}
              aria-pressed={view === 'table'}
              onClick={() => onSetView('table')}
              className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
            >
              <ListTree className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            {t('list.newWorkflow')}
          </Button>
        </div>
      </StickyToolbar>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={Workflow}
            title={t('list.empty.title')}
            description={t('list.empty.description')}
            actionLabel={t('list.newWorkflow')}
            onAction={() => setCreating(true)}
          />
        ) : filtered.length === 0 ? (
          <EmptyState Icon={Workflow} title={t('list.noMatches', { query: q })} />
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
