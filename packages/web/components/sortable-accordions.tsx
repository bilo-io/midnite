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
import { cn } from '@/lib/utils';

export type AccordionSection = {
  /** Stable id used for ordering, collapse state and drag identity. */
  id: string;
  label: ReactNode;
  /** Dot color: HSL triple/var used inside hsl(). Ignored when `leading` is set. */
  hue?: string;
  /** Dot color: raw CSS color. Takes precedence over `hue`. Ignored when `leading` is set. */
  color?: string;
  /** Replaces the colored dot in the header (e.g. a ProjectTag chip). */
  leading?: ReactNode;
  /** Count shown in the pill badge. */
  count: number;
  /** Extra text shown beside the title only while collapsed (e.g. "3 tasks · 1 project"). */
  summary: string;
  body: ReactNode;
};

/**
 * A vertical list of collapsible accordion sections that can be reordered by
 * dragging each section's grip handle. Section order and collapsed state persist
 * in localStorage under `${storageKey}.order` / `${storageKey}.collapsed`, keyed
 * by section id, so the layout survives reloads and added/removed sections are
 * reconciled (known ids keep their order, new ids append). Shared by the Tasks
 * table, the Projects tree and the Sessions table.
 */
export function SortableAccordions({
  sections,
  storageKey,
}: {
  sections: AccordionSection[];
  storageKey: string;
}) {
  const orderKey = `${storageKey}.order`;
  const collapsedKey = `${storageKey}.collapsed`;
  const byId = useMemo(() => new Map(sections.map((s) => [s.id, s] as const)), [sections]);
  const defaultOrder = useMemo(() => sections.map((s) => s.id), [sections]);

  const [storedOrder, setStoredOrder] = useState<string[] | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const rawOrder = window.localStorage.getItem(orderKey);
      if (rawOrder) {
        const parsed = JSON.parse(rawOrder) as unknown;
        if (Array.isArray(parsed)) setStoredOrder(parsed.filter((v): v is string => typeof v === 'string'));
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

  // Reconcile the stored order with the current section ids: keep known ids in
  // their stored order, then append any new ids in their natural order.
  const order = useMemo(() => {
    if (!storedOrder) return defaultOrder;
    const known = storedOrder.filter((id) => byId.has(id));
    const extra = defaultOrder.filter((id) => !known.includes(id));
    return [...known, ...extra];
  }, [storedOrder, defaultOrder, byId]);

  const ordered = order.map((id) => byId.get(id)).filter((s): s is AccordionSection => Boolean(s));

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
      <SortableContext items={ordered.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ordered.map((section) => (
            <Section
              key={section.id}
              section={section}
              collapsed={collapsed.has(section.id)}
              onToggle={() => toggle(section.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Section({
  section,
  collapsed,
  onToggle,
}: {
  section: AccordionSection;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const dot = section.color ?? `hsl(${section.hue ?? '215 14% 52%'})`;
  const glow = section.color
    ? `0 0 8px -1px color-mix(in srgb, ${section.color} 70%, transparent)`
    : `0 0 8px -1px hsl(${section.hue ?? '215 14% 52%'} / 0.7)`;

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card/60 backdrop-blur-sm',
        isDragging && 'z-10 shadow-lg',
      )}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Reorder section"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground/60 hover:bg-accent/50 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex flex-1 items-center gap-2 rounded py-1 pr-1 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              collapsed && '-rotate-90',
            )}
          />
          {section.leading ?? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: dot, boxShadow: glow }}
            />
          )}
          <h2 className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {section.label}
          </h2>
          <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {section.count}
          </span>
          {collapsed && (
            <span className="ml-1 truncate text-[11px] text-muted-foreground/70">{section.summary}</span>
          )}
        </button>
      </div>
      {!collapsed && <div className="border-t border-border/60">{section.body}</div>}
    </section>
  );
}
