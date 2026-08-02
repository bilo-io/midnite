'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { listNodeTypes, type NodeCategory } from '@midnite/shared';
import { hueVarForCategory, iconFor, NODE_DRAG_MIME } from '@/lib/workflow-node-catalog';
import { useNodeLabels } from '@/lib/workflow-node-labels';
import { useWorkflowStore } from '@/lib/workflow-store';

// Triggers are intentionally absent: a workflow has exactly one canonical trigger
// (synced from workflow.trigger), so only the non-trigger categories are draggable
// onto the canvas. Order here is the order they render in the sidebar; the visible
// heading comes from `workflows.palette.categories.<category>`.
const GROUPS: NodeCategory[] = ['action', 'logic', 'data', 'storage'];

export function NodePalette() {
  const t = useTranslations('workflows.palette');
  const { title, description } = useNodeLabels();
  const addNode = useWorkflowStore((s) => s.addNode);
  const [query, setQuery] = useState('');
  // Categories the user has collapsed. An active search overrides this so every
  // matching node is visible regardless of collapse state.
  const [collapsed, setCollapsed] = useState<Set<NodeCategory>>(new Set());

  const trimmed = query.trim();

  // Search the *translated* copy — what the user can actually read on screen.
  const matches = useMemo(() => {
    const q = trimmed.toLowerCase();
    const defs = listNodeTypes().filter((d) => d.category !== 'trigger');
    if (!q) return defs;
    return defs.filter(
      (d) => title(d).toLowerCase().includes(q) || description(d).toLowerCase().includes(q),
    );
  }, [trimmed, title, description]);

  function toggle(category: NodeCategory) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border/60 bg-background/40 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          aria-label={t('search')}
          className="h-8 w-full rounded-md border border-border/60 bg-card/60 pl-8 pr-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">{t('hint')}</p>

      {matches.length === 0 ? (
        <p className="px-1 text-[11px] text-muted-foreground">{t('empty', { query })}</p>
      ) : (
        GROUPS.map((category) => {
          const items = matches.filter((d) => d.category === category);
          if (items.length === 0) return null;
          // Searching forces sections open so matches are never hidden.
          const open = trimmed.length > 0 || !collapsed.has(category);
          const Chevron = open ? ChevronDown : ChevronRight;
          return (
            <div key={category} className="space-y-1.5">
              <button
                type="button"
                onClick={() => toggle(category)}
                aria-expanded={open}
                className="flex w-full items-center gap-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <Chevron className="h-3 w-3 shrink-0" />
                <span className="flex-1 text-left">{t(`categories.${category}`)}</span>
                <span className="tabular-nums opacity-70">{items.length}</span>
              </button>
              {open &&
                items.map((d) => {
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
                      title={description(d)}
                      className="flex w-full cursor-grab items-center gap-2 rounded-md border border-border/60 bg-card/60 px-2.5 py-2 text-left text-xs transition-colors hover:border-foreground/20 hover:bg-accent/40 active:cursor-grabbing"
                      style={{ ['--node-hue' as string]: `var(${hueVar})` }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                        style={{ background: 'hsl(var(--node-hue) / 0.18)', color: 'hsl(var(--node-hue))' }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">{title(d)}</span>
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
