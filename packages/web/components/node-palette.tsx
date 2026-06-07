'use client';

import { listNodeTypes, type NodeCategory } from '@midnite/shared';
import { hueVarForCategory, iconFor } from '@/lib/workflow-node-catalog';
import { useWorkflowStore } from '@/lib/workflow-store';

const GROUPS: Array<{ category: NodeCategory; label: string }> = [
  { category: 'action', label: 'Actions' },
  { category: 'logic', label: 'Logic' },
];

export function NodePalette() {
  const addNode = useWorkflowStore((s) => s.addNode);
  const defs = listNodeTypes();

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border/60 bg-background/40 p-3">
      <p className="px-1 text-[11px] text-muted-foreground">Click to add a node, then connect it.</p>
      {GROUPS.map((group) => {
        const items = defs.filter((d) => d.category === group.category);
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
                  onClick={() => addNode(d.id)}
                  title={d.description}
                  className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-left text-xs transition-colors hover:border-foreground/20 hover:bg-accent/40"
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
      })}
    </aside>
  );
}
