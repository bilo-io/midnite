'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { WorkflowSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { WorkflowCard } from '@/components/workflow-card';
import { WorkflowCreateModal } from '@/components/workflow-create-modal';

export function WorkflowsView({ initial }: { initial: WorkflowSummary[] }) {
  const [creating, setCreating] = useState(false);
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const filtered = q
    ? initial.filter((w) =>
        [w.name, w.description ?? ''].some((f) => f.toLowerCase().includes(q)),
      )
    : initial;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {filtered.length} workflow{filtered.length === 1 ? '' : 's'}
        </p>
        <Button type="button" size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          New workflow
        </Button>
      </div>

      {initial.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No workflows yet. Build an automation that runs on a schedule, a webhook, or on demand.
          </p>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No workflows match “{q}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => (
            <WorkflowCard key={w.id} workflow={w} />
          ))}
        </div>
      )}

      {creating ? <WorkflowCreateModal onClose={() => setCreating(false)} /> : null}
    </div>
  );
}
