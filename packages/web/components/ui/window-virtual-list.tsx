'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

type WindowVirtualListProps<T> = {
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
  /** Classes for the list container (no height/overflow needed — it scrolls with the page). */
  className?: string;
};

/**
 * Phase 57 F — headless **window**-virtualized list over
 * `@tanstack/react-virtual`'s `useWindowVirtualizer`. Unlike the bounded-container
 * {@link VirtualList}, this windows rows against the **document scroll**, so a long
 * list inside a status-grouped accordion keeps the DOM bounded **without** a
 * per-section inner scrollbar — the page scrolls naturally. That's the property
 * that lets the sessions / workflows / projects accordions virtualize (they were
 * deferred in the original Theme F precisely because a bounded container would add
 * an inner scrollbar per section).
 *
 * Below `threshold` it renders a plain list — no windowing overhead for the common
 * short section. Heights are measured per-row (`measureElement`); the list's
 * document offset (`scrollMargin`) is measured so multiple per-section virtualizers
 * on one page each compute their visible range correctly.
 */
export function WindowVirtualList<T>({
  items,
  rowKey,
  renderRow,
  estimateRow = 56,
  gap = 0,
  threshold = 50,
  overscan = 8,
  className,
}: WindowVirtualListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const windowed = items.length > threshold;

  // The list's offset from the top of the document — the window virtualizer needs
  // it to map document scroll onto this section's rows. `rect.top + scrollY` is
  // scroll-invariant, so we only re-measure on layout shifts: window resize, row
  // count changes, and — via a ResizeObserver on the element — this section's own
  // accordion expand (Collapse keeps children mounted but clipped, so expanding
  // resizes this element and moves the rows below into place).
  useLayoutEffect(() => {
    if (!windowed) return;
    const measure = () => {
      const el = listRef.current;
      if (el) setScrollMargin(el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [windowed, items.length]);

  const virtualizer = useWindowVirtualizer({
    count: windowed ? items.length : 0,
    estimateSize: () => estimateRow + gap,
    overscan,
    scrollMargin,
  });

  // Small section → plain flow layout, byte-for-byte the pre-virtualization render.
  if (!windowed) {
    return (
      <div
        className={className}
        style={gap ? { display: 'flex', flexDirection: 'column', rowGap: gap } : undefined}
      >
        {items.map((item, i) => (
          <div key={rowKey(item, i)}>{renderRow(item, i)}</div>
        ))}
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  return (
    <div
      ref={listRef}
      className={cn('relative w-full', className)}
      style={{ height: virtualizer.getTotalSize() }}
    >
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
              transform: `translateY(${vr.start - virtualizer.options.scrollMargin}px)`,
              paddingBottom: gap || undefined,
            }}
          >
            {renderRow(item, vr.index)}
          </div>
        );
      })}
    </div>
  );
}
