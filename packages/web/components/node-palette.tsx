'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { listNodeTypes, type NodeCategory } from '@midnite/shared';
import { hueVarForCategory, iconFor, NODE_DRAG_MIME } from '@/lib/workflow-node-catalog';
import { useWorkflowStore } from '@/lib/workflow-store';

// Triggers are intentionally absent: a workflow has exactly one canonical trigger
// (synced from workflow.trigger), so only actions and logic are draggable onto the canvas.
const GROUPS: Array<{ category: NodeCategory; label: string }> = [
  { category: 'action', label: 'Actions' },
  { category: 'logic', label: 'Logic' },
];

export function NodePalette() {
  const addNode = useWorkflowStore((s) => s.addNode);
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const defs = listNodeTypes().filter((d) => d.category !== 'trigger');
    if (!q) return defs;
    return defs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-background/40 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search nodes"
          aria-label="Search nodes"
          className="h-8 w-full rounded-md border border-border/60 bg-card/60 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">Drag onto the canvas, or click to add.</p>

      {matches.length === 0 ? (
        <p className="px-1 text-[11px] text-muted-foreground">No nodes match “{query}”.</p>
      ) : (
        GROUPS.map((group) => {
          const items = matches.filter((d) => d.category === group.category);
          if (items.length === 0) return null;
          return (
            <div key={group.category} className="space-y-1.5">
              <p className="px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {items.map((d) => {
                const Icon = iconFor(d.icon);
                const hueVar = hueVarForCategory(d.category);
                return (
                  <button
                    key={d.id}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(NODE_DRAG_MIME, d.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => addNode(d.id)}
                    title={d.description}
                    className="flex w-full cursor-grab items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-left text-xs transition-colors hover:border-foreground/20 hover:bg-accent/40 active:cursor-grabbing"
                    style={{ ['--node-hue' as string]: `var(${hueVar})` }}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                      style={{ background: 'hsl(var(--node-hue) / 0.18)', color: 'hsl(var(--node-hue))' }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </aside>
  );
}
