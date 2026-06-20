'use client';

import { useEffect, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';

/**
 * Tab strip above the grid. Each tab is its own dashboard. The first tab is a
 * fixed anchor; the rest can be pinned (locked to the front zone, no close) and
 * dragged to reorder — within their zone only (pinned amongst pinned, unpinned
 * amongst unpinned). Double-click a tab to rename; "+" adds up to {@link MAX_DASHBOARDS}.
 */
export function DashboardTabs() {
  const { tabs, activeId, hydrated, setActiveId, addTab, closeTab, renameTab, togglePin, reorderTabs } =
    useDashboardTabs();
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
      aria-label={`Rename ${tab.name}`}
      className="h-8 w-36 rounded-md border border-primary bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      />
    );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
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
              onDoubleClick={() => startRename(defaultTab.id, defaultTab.name)}
              className="max-w-[12rem] truncate focus-visible:outline-none"
              title={`${defaultTab.name} — double-click to rename`}
            >
              {defaultTab.name}
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
          onClick={addTab}
          aria-label="Add dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Shared chip styling: solid when active, outlined otherwise. */
function chipClass(active: boolean): string {
  return cn(
    'flex h-8 items-center gap-1 rounded-md text-sm transition-colors',
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
}: {
  tab: DashboardTab;
  active: boolean;
  onActivate: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onClose: () => void;
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
        aria-label={tab.pinned ? `Unpin ${tab.name}` : `Pin ${tab.name}`}
        aria-pressed={tab.pinned}
        title={tab.pinned ? 'Unpin' : 'Pin'}
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
        title={`${tab.name} — drag to reorder, double-click to rename`}
      >
        {tab.name}
      </button>

      {!tab.pinned && (
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${tab.name}`}
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
