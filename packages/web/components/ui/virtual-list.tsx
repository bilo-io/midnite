'use client';

import { useRef, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

type VirtualListProps<T> = {
  items: T[];
  /** Stable key per row. */
  rowKey: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
  /** Rough starting row height (px) before real measurement kicks in. */
  estimateRow?: number;
  /** Vertical gap between rows (px) — folded into each row so windowing stays exact. */
  gap?: number;
  /** Rows above this count switch to windowed rendering; at/under it we render plain
   *  (no scroll-measure overhead, no abs-positioning for the common small case). */
  threshold?: number;
  overscan?: number;
  /** Scroll-container classes — MUST bound the height (e.g. `h-full`, `max-h-[70vh]`). */
  className?: string;
};

/**
 * Phase 57 F — headless windowed list over `@tanstack/react-virtual`. Only the
 * visible rows (plus overscan) mount, so the DOM stays bounded no matter the row
 * count. Heights are measured per-row (`measureElement`) so variable-height rows
 * render correctly. Below `threshold` it renders a plain list — no windowing
 * overhead for short lists. Used by the flat lists (sessions/workflows/projects/
 * run-history/approval-log); the dnd-kit board wires the virtualizer directly.
 */
export function VirtualList<T>({
  items,
  rowKey,
  renderRow,
  estimateRow = 56,
  gap = 0,
  threshold = 50,
  overscan = 8,
  className,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRow + gap,
    overscan,
  });

  // Small list → plain flow layout (still inside the same scroll container so the
  // caller's height/overflow classes behave identically either way).
  if (items.length <= threshold) {
    return (
      <div ref={parentRef} className={cn('overflow-y-auto', className)}>
        <div style={gap ? { display: 'flex', flexDirection: 'column', rowGap: gap } : undefined}>
          {items.map((item, i) => (
            <div key={rowKey(item, i)}>{renderRow(item, i)}</div>
          ))}
        </div>
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  return (
    <div ref={parentRef} className={cn('overflow-y-auto', className)}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {virtualRows.map((vr) => {
          const item = items[vr.index];
          if (item === undefined) return null;
          return (
            <div
              key={rowKey(item, vr.index)}
              data-index={vr.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vr.start}px)`,
                paddingBottom: gap || undefined,
              }}
            >
              {renderRow(item, vr.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
