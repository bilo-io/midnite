'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical } from 'lucide-react';
import { Collapse } from '@/components/ui/collapse';
import { cn } from '@/lib/utils';

export type StatusGroup = {
  /** Stable id used for ordering, collapse state and drag identity. */
  id: string;
  label: ReactNode;
  /** Dot color: HSL triple used inside hsl(). */
  hue: string;
  count: number;
  body: ReactNode;
};

/**
 * A vertical stack of collapsible, reorderable status groups for the Sessions
 * list/grid. Deliberately *not* the bordered accordion (SortableAccordions) —
 * just a minimal header row (grip · dot · label · count · chevron) over an
 * animated body, with no surrounding card chrome. Clicking the title or the
 * chevron toggles; dragging the grip reorders. Order and collapsed state persist
 * in localStorage under `${storageKey}.order` / `${storageKey}.collapsed`, keyed
 * by group id, and are reconciled when groups appear/disappear (known ids keep
 * their order, new ids append).
 */
export function CollapsibleStatusGroups({
  groups,
  storageKey,
}: {
  groups: StatusGroup[];
  storageKey: string;
}) {
  const orderKey = `${storageKey}.order`;
  const collapsedKey = `${storageKey}.collapsed`;
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g] as const)), [groups]);
  const defaultOrder = useMemo(() => groups.map((g) => g.id), [groups]);

  const [storedOrder, setStoredOrder] = useState<string[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const rawOrder = window.localStorage.getItem(orderKey);
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder) as unknown;
        if (Array.isArray(parsed)) {
          setStoredOrder(parsed.filter((v): v is string => typeof v === 'string'));
        }
      }
      const rawCollapsed = window.localStorage.getItem(collapsedKey);
      if (rawCollapsed) {
        const parsed = JSON.parse(rawCollapsed) as unknown;
        if (Array.isArray(parsed)) {
          setCollapsed(new Set(parsed.filter((v): v is string => typeof v === 'string')));
        }
      }
    } catch {
      // localStorage unavailable; fall back to default order, all expanded.
    }
  }, [orderKey, collapsedKey]);

  // Reconcile the stored order with the current group ids: keep known ids in
  // their stored order, then append any new ids in their natural order.
  const order = useMemo(() => {
    if (!storedOrder) return defaultOrder;
    const known = storedOrder.filter((id) => byId.has(id));
    const extra = defaultOrder.filter((id) => !known.includes(id));
    return [...known, ...extra];
  }, [storedOrder, defaultOrder, byId]);

  const ordered = order.map((id) => byId.get(id)).filter((g): g is StatusGroup => Boolean(g));

  const persistOrder = (next: string[]) => {
    setStoredOrder(next);
    try {
      window.localStorage.setItem(orderKey, JSON.stringify(next));
    } catch {
      // best-effort
    }
  };

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(collapsedKey, JSON.stringify([...next]));
      } catch {
        // best-effort
      }
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    persistOrder(arrayMove(order, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ordered.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-6">
          {ordered.map((group) => (
            <Group
              key={group.id}
              group={group}
              collapsed={collapsed.has(group.id)}
              onToggle={() => toggle(group.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Group({
  group,
  collapsed,
  onToggle,
}: {
  group: StatusGroup;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('group/section flex flex-col gap-2', isDragging && 'z-10 opacity-90')}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Reorder section"
          className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent/50 hover:text-foreground focus-visible:opacity-100 group-hover/section:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-2 rounded py-0.5 text-left"
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: `hsl(${group.hue})`, boxShadow: `0 0 8px -1px hsl(${group.hue} / 0.7)` }}
          />
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </h2>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {group.count}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              collapsed && '-rotate-90',
            )}
          />
        </button>
      </div>
      <Collapse open={!collapsed}>{group.body}</Collapse>
    </section>
  );
}
