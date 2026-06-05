'use client';

import * as React from 'react';
import { ListPlus } from 'lucide-react';
import type { FeatureDraft } from '@/lib/feature-drafts';
import { cn } from '@/lib/utils';

const FADE = 28; // px of edge fade

type Props = {
  drafts: FeatureDraft[];
  onOpen: (id: string) => void;
};

/**
 * Horizontally-scrolling row of feature-list-request pills. When the row
 * overflows its container the overflowing edge(s) fade out via a CSS mask, and
 * the side(s) that can still be scrolled get the gradient.
 */
export function FeatureListPills({ drafts, onOpen }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const recompute = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  React.useEffect(() => {
    recompute();
  }, [recompute, drafts.length]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  if (drafts.length === 0) return null;

  // Build a horizontal mask that only fades the scrollable edges.
  const leftStop = edges.left ? `transparent 0, black ${FADE}px` : 'black 0';
  const rightStop = edges.right ? `black calc(100% - ${FADE}px), transparent 100%` : 'black 100%';
  const maskImage = `linear-gradient(to right, ${leftStop}, ${rightStop})`;

  return (
    <div
      ref={ref}
      onScroll={recompute}
      className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2"
      style={{ maskImage, WebkitMaskImage: maskImage }}
    >
      {drafts.map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onOpen(d.id)}
          title={d.name}
          className={cn(
            'group inline-flex max-w-[16rem] shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur',
            'transition-colors hover:border-border hover:bg-accent hover:text-accent-foreground',
          )}
        >
          <ListPlus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
          <span className="truncate">{d.name}</span>
        </button>
      ))}
    </div>
  );
}
