'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pin, Plus, X } from 'lucide-react';
import { MAX_DASHBOARDS, isDefaultTab, useDashboardTabs, type DashboardTab } from '@/lib/dashboard-tabs';
import { StickyToolbar } from '@/components/sticky-toolbar';
import { cn } from '@/lib/utils';

/**
 * Tab strip above the grid. Each tab is its own dashboard. The first tab is a
 * fixed anchor; the rest can be pinned (locked to the front zone, no close) and
 * dragged to reorder — within their zone only (pinned amongst pinned, unpinned
 * amongst unpinned). Double-click a tab to rename; "+" adds up to {@link MAX_DASHBOARDS}.
 * `trailing` renders far-right on the same line (e.g. the add-widget button).
 */
/** The per-tab copy `SortableTab` renders; resolved once in the parent. */
type SortableTabLabels = {
  pin: string;
  unpin: string;
  pinNamed: (name: string) => string;
  unpinNamed: (name: string) => string;
  closeNamed: (name: string) => string;
  dragHint: (name: string) => string;
};

export function DashboardTabs({ trailing }: { trailing?: ReactNode } = {}) {
  const t = useTranslations('dashboard');
  const { tabs, activeId, hydrated, setActiveId, addTab, closeTab, renameTab, togglePin, reorderTabs } =
    useDashboardTabs();
  const tabLabels: SortableTabLabels = useMemo(
    () => ({
      pin: t('tabs.pin'),
      unpin: t('tabs.unpin'),
      pinNamed: (name) => t('tabs.pinNamed', { name }),
      unpinNamed: (name) => t('tabs.unpinNamed', { name }),
      closeNamed: (name) => t('tabs.closeNamed', { name }),
      dragHint: (name) => t('tabs.dragHint', { name }),
    }),
    [t],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  // Avoid flashing the default tab before localStorage is read.
  if (!hydrated) return null;

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setDraft(name);
  };
  const commitRename = () => {
    if (editingId) renameTab(editingId, draft);
    setEditingId(null);
  };

  const defaultTab = tabs[0];
  // The anchor tab ships unnamed (see `DEFAULT_TABS`); an empty stored name means
  // "show the localised page title", so a fresh install reads in the active locale.
  const defaultName = defaultTab?.name || t('page.title');
  const nonDefault = tabs.filter((t) => !isDefaultTab(t.id));
  const pinned = nonDefault.filter((t) => t.pinned);
  const unpinned = nonDefault.filter((t) => !t.pinned);
  const pinnedById = new Map(nonDefault.map((t) => [t.id, !!t.pinned]));

  // Confine a drag to its own zone: only same-pinned-status tabs are valid drop
  // targets, so a pinned tab can never land among unpinned tabs (or vice versa).
  const collisionDetection: CollisionDetection = (args) => {
    const activePinned = pinnedById.get(String(args.active.id));
    const candidates = args.droppableContainers.filter(
      (c) => pinnedById.get(String(c.id)) === activePinned,
    );
    return closestCenter({ ...args, droppableContainers: candidates });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = nonDefault.map((t) => t.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    reorderTabs(arrayMove(ids, from, to));
  };

  const renameInput = (tab: DashboardTab) => (
    <input
      key={tab.id}
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commitRename}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') setEditingId(null);
      }}
      aria-label={t('tabs.rename', { name: tab.name })}
      className="h-8 w-36 shrink-0 rounded-md border border-primary bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );

  const renderSortable = (tab: DashboardTab) =>
    editingId === tab.id ? (
      renameInput(tab)
    ) : (
      <SortableTab
        key={tab.id}
        tab={tab}
        active={tab.id === activeId}
        onActivate={() => setActiveId(tab.id)}
        onRename={() => startRename(tab.id, tab.name)}
        onTogglePin={() => togglePin(tab.id)}
        onClose={() => closeTab(tab.id)}
        labels={tabLabels}
      />
    );

  return (
    // The standard sticky list-controls row — pins the tab strip (and the
    // trailing add-widget button) under the collapsed header / desktop title
    // bar instead of letting it scroll away with the grid. Unlike other
    // StickyToolbar usages, the grid underneath renders much larger/bolder
    // text than list-page rows (tile counts, clock/date/weather widgets all
    // use text-4xl+ font-semibold) — the shared component's default 8px blur
    // (verified identical CSS/computed-style to every other page) washes out
    // small body text but leaves big bold glyphs as a legible shape, so this
    // usage alone needs a stronger radius to read as obscured. Scoped here
    // (not in sticky-toolbar.tsx) so other pages' look is untouched.
    <StickyToolbar className="mb-3 backdrop-blur-2xl">
      {/* `min-w-0` lets this row shrink below its content width inside the
          `justify-between` toolbar so it scrolls horizontally instead of
          wrapping (or pushing the trailing add-widget button off-screen) once
          enough dashboards are pinned/added to overflow the available space. */}
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto">
        {defaultTab &&
          (editingId === defaultTab.id ? (
            renameInput(defaultTab)
          ) : (
            <div
              key={defaultTab.id}
              className={cn(chipClass(defaultTab.id === activeId), 'px-3')}
            >
              <button
                type="button"
                onClick={() => setActiveId(defaultTab.id)}
                onDoubleClick={() => startRename(defaultTab.id, defaultName)}
                className="max-w-[12rem] truncate focus-visible:outline-none"
                title={t('tabs.defaultHint', { name: defaultName })}
              >
                {defaultName}
              </button>
            </div>
          ))}

        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
          <SortableContext items={nonDefault.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {pinned.map(renderSortable)}
            {pinned.length > 0 && unpinned.length > 0 && (
              <div aria-hidden className="mx-0.5 h-5 w-px shrink-0 self-center bg-border" />
            )}
            {unpinned.map(renderSortable)}
          </SortableContext>
        </DndContext>

        {tabs.length < MAX_DASHBOARDS && (
          <button
            type="button"
            onClick={() => addTab(t('tabs.newName', { n: tabs.length + 1 }))}
            aria-label={t('tabs.add')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </StickyToolbar>
  );
}

/** Shared chip styling: solid when active, outlined otherwise. */
function chipClass(active: boolean): string {
  return cn(
    'flex h-8 shrink-0 items-center gap-1 rounded-md text-sm transition-colors',
    active
      ? 'bg-primary font-medium text-primary-foreground'
      : 'border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  );
}

/** A draggable non-default tab: pin toggle · name (drag activator) · close (if unpinned). */
function SortableTab({
  tab,
  active,
  onActivate,
  onRename,
  onTogglePin,
  onClose,
  labels,
}: {
  tab: DashboardTab;
  active: boolean;
  onActivate: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onClose: () => void;
  /** Resolved copy, passed down so this stays a presentational chip. */
  labels: SortableTabLabels;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: tab.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group/tab px-1.5',
        chipClass(active),
        tab.pinned && !active && 'border-primary/40',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={tab.pinned ? labels.unpinNamed(tab.name) : labels.pinNamed(tab.name)}
        aria-pressed={tab.pinned}
        title={tab.pinned ? labels.unpin : labels.pin}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-opacity',
          tab.pinned
            ? active
              ? 'text-primary-foreground'
              : 'text-primary'
            : 'opacity-0 hover:text-foreground group-hover/tab:opacity-60',
        )}
      >
        <Pin className={cn('h-3 w-3', tab.pinned && 'fill-current')} />
      </button>

      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={onActivate}
        onDoubleClick={onRename}
        className="max-w-[12rem] cursor-grab truncate px-0.5 focus-visible:outline-none active:cursor-grabbing"
        title={labels.dragHint(tab.name)}
      >
        {tab.name}
      </button>

      {!tab.pinned && (
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.closeNamed(tab.name)}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-colors',
            active ? 'hover:bg-primary-foreground/20' : 'hover:bg-destructive/15 hover:text-destructive',
          )}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
