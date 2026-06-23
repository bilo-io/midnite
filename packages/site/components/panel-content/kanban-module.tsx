'use client';

import { useEffect, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';

const COLUMNS = ['To do', 'In progress', 'Done'];

// Static filler cards per column so the board reads as populated.
const FILLER: string[][] = [
  ['bump deps', 'write changelog'],
  ['fix flaky login'],
  ['migrate config', 'add CI cache'],
];

/**
 * Stylised kanban board — an evocation of the app, not the real component. A single
 * "traveller" card loops across the columns (shared-layout move) so the board feels
 * alive. Static under reduced motion.
 */
export function KanbanModule() {
  const reduced = useReducedMotion();
  const [col, setCol] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setCol((c) => (c + 1) % COLUMNS.length), 2200);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <LayoutGroup>
      <div className="grid h-full w-full grid-cols-3 gap-2 p-3">
        {COLUMNS.map((name, i) => (
          <div key={name} className="flex min-w-0 flex-col rounded-lg bg-muted/40 p-2">
            <p className="mb-2 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {name}
            </p>
            <div className="space-y-1.5">
              {FILLER[i]?.map((label) => (
                <div
                  key={label}
                  className="truncate rounded-md border border-border/50 bg-card/80 px-2 py-1.5 text-[10px] text-muted-foreground"
                >
                  {label}
                </div>
              ))}
              {col === i ? (
                <motion.div
                  layoutId="kanban-traveller"
                  layout={!reduced}
                  className="truncate rounded-md border border-[#8b5cf6]/50 bg-card px-2 py-1.5 text-[10px] font-medium text-foreground shadow-sm"
                >
                  add dark mode
                </motion.div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </LayoutGroup>
  );
}
