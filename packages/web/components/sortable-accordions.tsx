'use client';

import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { useTranslations } from 'next-intl';
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
  /** Interactive node rendered before the toggle button (e.g. a select checkbox).
   * Kept outside the toggle so it can carry its own clicks without nested buttons. */
  prefix?: ReactNode;
  /** Count shown in the pill badge. */
  count: number;
  /** Extra text shown beside the title only while collapsed (e.g. "3 tasks · 1 project").
   *  Pass an empty string to show nothing (e.g. when a `progress` bar replaces it). */
  summary: string;
  /** When set, a thin primary-gradient progress bar sits next to the count pill,
   *  filled to `done / total` (e.g. tasks completed). Shown expanded and collapsed. */
  progress?: { done: number; total: number };
  /** Trailing controls in the header (right-aligned), e.g. an edit button. */
  actions?: ReactNode;
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
/**
 * How much card chrome a section wears:
 * - `card` (default): one bordered glass card wraps the header + body together,
 *   split by a divider — the classic accordion.
 * - `bare`: no chrome at all — just a naked header row over the body, so the
 *   content floats freely (matches the Sessions list). Used by the per-project board.
 * - `split`: a naked header floating above the body, with the body enclosed in its
 *   own bordered glass card — the header reads light while the rows stay contained.
 */
export type AccordionVariant = 'card' | 'bare' | 'split';

export function SortableAccordions({
  sections,
  storageKey,
  variant = 'card',
}: {
  sections: AccordionSection[];
  storageKey: string;
  /** Card-chrome treatment for each section — see {@link AccordionVariant}. */
  variant?: AccordionVariant;
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
    // Mouse keeps the small distance-activation; touch needs a press-and-hold
    // delay so a plain swipe scrolls instead of grabbing a row (Phase 24 Theme B).
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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
        <div className={cn('flex flex-col', variant === 'card' ? 'gap-2' : 'gap-4')}>
          {ordered.map((section) => (
            <Section
              key={section.id}
              section={section}
              collapsed={collapsed.has(section.id)}
              onToggle={() => toggle(section.id)}
              variant={variant}
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
  variant = 'card',
}: {
  section: AccordionSection;
  collapsed: boolean;
  onToggle: () => void;
  variant?: AccordionVariant;
}) {
  const t = useTranslations('common');
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const dot = section.color ?? `hsl(${section.hue ?? '215 14% 52%'})`;
  const glow = section.color
    ? `0 0 8px -1px color-mix(in srgb, ${section.color} 70%, transparent)`
    : `0 0 8px -1px hsl(${section.hue ?? '215 14% 52%'} / 0.7)`;

  // `card` wraps the whole section; `bare`/`split` leave the header naked (only
  // `split` re-cards the body — see the Collapse below).
  const headerNaked = variant !== 'card';

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative',
        headerNaked
          ? isDragging && 'z-10 opacity-90'
          : cn('overflow-hidden rounded-lg border surface-glass', isDragging && 'z-10 shadow-lg'),
      )}
    >
      <div className={cn('flex items-center gap-2', headerNaked ? 'py-1' : 'px-2 py-2')}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={t('reorderSection')}
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {section.prefix ?? null}
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
          {section.progress && section.progress.total > 0 ? (
            <ProgressBar done={section.progress.done} total={section.progress.total} />
          ) : null}
          {collapsed && section.summary ? (
            <span className="ml-1 truncate text-[11px] text-muted-foreground">{section.summary}</span>
          ) : null}
        </button>
        {section.actions ? (
          <div className="flex shrink-0 items-center gap-0.5 pr-1">{section.actions}</div>
        ) : null}
      </div>
      <Collapse open={!collapsed}>
        <div
          className={cn(
            // `card`: a divider under the shared card's header.
            variant === 'card' && 'border-t border-border/60',
            // `split`: the body gets its own bordered glass card under the naked header.
            variant === 'split' && 'mt-1 overflow-hidden rounded-lg border surface-glass',
            // `bare`: nothing — the body floats.
          )}
        >
          {section.body}
        </div>
      </Collapse>
    </section>
  );
}

/** A thin completion bar filled in the active primary/accent gradient — `done`
 *  of `total`. Sits beside the count pill; purely presentational (the header
 *  button owns the interaction). */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = Math.round((Math.min(done, total) / total) * 100);
  return (
    <span
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${done} of ${total} done`}
      title={`${done} of ${total} done`}
      className="ml-1 h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-muted/50"
    >
      <span
        className="block h-full rounded-full transition-[width] duration-500"
        style={{ width: `${pct}%`, backgroundImage: 'var(--accent-gradient, var(--brand-gradient))' }}
      />
    </span>
  );
}
