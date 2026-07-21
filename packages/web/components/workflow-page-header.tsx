'use client';

import { PageHeader } from '@/components/page-header';
import { useWorkflowStore } from '@/lib/workflow-store';

/**
 * The workflow editor's page header (Phase 74) — the same shared `PageHeader`
 * every detail view uses (back link + title + subtitle), but with the title and
 * description made **inline-editable**, since a workflow is authored here rather
 * than merely viewed. Lives inside the `WorkflowStoreContext` so it can bind
 * straight to the store; edits mark the graph dirty and autosave persists them.
 */
export function WorkflowPageHeader() {
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const description = useWorkflowStore((s) => s.description);
  const setDescription = useWorkflowStore((s) => s.setDescription);

  return (
    <PageHeader
      title={name || 'Untitled workflow'}
      icon="Workflow"
      back={{ href: '/workflows', label: 'All workflows' }}
      titleNode={
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Workflow name"
          placeholder="Untitled workflow"
          // Inherits the h1's size/weight (Tailwind preflight sets font-size/weight
          // to inherit on inputs); auto-sizes to its content so it reads as heading
          // text rather than a boxed field.
          size={Math.max(name.length, 8)}
          className="-mx-1 min-w-0 max-w-full rounded px-1 outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:ring-1 focus:ring-ring"
        />
      }
      description={
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Workflow description"
          placeholder="Describe what this workflow does…"
          className="-mx-1 w-full max-w-2xl rounded px-1 outline-none transition-colors hover:bg-accent/40 focus:bg-accent/40 focus:text-foreground focus:ring-1 focus:ring-ring"
        />
      }
    />
  );
}
