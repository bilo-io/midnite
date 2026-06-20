'use client';

import Link from 'next/link';
import { Workflow } from 'lucide-react';
import type { TriggerType, WorkflowSummary } from '@midnite/shared';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { LastRunStatus, WorkflowEnabledSwitch } from '@/components/workflow-controls';
import { cronIntervalSeconds, describeCron, describeFrequency } from '@/lib/cron';
import { cn } from '@/lib/utils';

// One accordion per trigger type. Sections are collapsible + reorderable (persisted),
// matching the Tasks/Projects tables. Shared with the grid/list views.
export const TRIGGER_SECTIONS: Array<{ type: TriggerType; label: string; hue: string }> = [
  { type: 'manual', label: 'Manual', hue: 'var(--status-backlog)' },
  { type: 'schedule', label: 'Schedule', hue: 'var(--status-todo)' },
  { type: 'webhook', label: 'Webhook', hue: 'var(--kind-feature)' },
];

function nodeLabel(count: number): string {
  return `${count} node${count === 1 ? '' : 's'}`;
}

function WorkflowRow({
  w,
  selected = false,
  onToggleSelect,
}: {
  w: WorkflowSummary;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b border-border/40 px-3 py-2 transition-colors last:border-0 hover:bg-accent/40',
        selected && 'bg-accent/30',
        w.archived && 'opacity-60',
      )}
    >
      <SelectableIcon Icon={Workflow} selected={selected} onToggle={(sk) => onToggleSelect?.(sk)} />
      <Link href={`/workflows/edit?id=${w.id}`} className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {w.archived ? (
            <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Archived
            </span>
          ) : null}
          <span className="truncate text-sm font-medium hover:text-foreground">{w.name}</span>
        </span>
        {w.description ? (
          <span className="block truncate text-xs text-muted-foreground">{w.description}</span>
        ) : null}
      </Link>
      {w.triggerType === 'schedule' && w.cron ? (
        <span
          className="hidden shrink-0 cursor-help font-mono text-[11px] text-muted-foreground sm:inline"
          title={`${describeFrequency(w.cron)} — ${describeCron(w.cron)}`}
        >
          {w.cron}
        </span>
      ) : null}
      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:block">
        {nodeLabel(w.nodeCount)}
      </span>
      <LastRunStatus status={w.lastRunStatus} className="hidden md:inline-flex" />
      <WorkflowEnabledSwitch id={w.id} enabled={w.enabled} />
    </div>
  );
}

export function WorkflowsTable({
  workflows,
  isSelected,
  onToggleSelect,
}: {
  workflows: WorkflowSummary[];
  isSelected?: (id: string) => boolean;
  onToggleSelect?: (id: string, shiftKey: boolean) => void;
}) {
  const sections: AccordionSection[] = TRIGGER_SECTIONS.map(({ type, label, hue }) => {
    let items = workflows.filter((w) => w.triggerType === type);
    let summary = items.length === 0 ? 'Empty' : `${items.length} workflow${items.length === 1 ? '' : 's'}`;

    if (type === 'schedule') {
      // Most frequent (smallest interval) first.
      items = [...items].sort(
        (a, b) => cronIntervalSeconds(a.cron ?? '') - cronIntervalSeconds(b.cron ?? ''),
      );
      if (items.length > 0) summary = `${items.length} · most frequent first`;
    }

    return {
      id: `trigger-${type}`,
      label,
      hue,
      count: items.length,
      summary,
      body:
        items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground/70">
            No {label.toLowerCase()} workflows
          </div>
        ) : (
          <div>
            {items.map((w) => (
              <WorkflowRow
                key={w.id}
                w={w}
                selected={isSelected?.(w.id) ?? false}
                onToggleSelect={onToggleSelect ? (sk) => onToggleSelect(w.id, sk) : undefined}
              />
            ))}
          </div>
        ),
    };
  });

  return <SortableAccordions sections={sections} storageKey="midnite.workflows.sections" />;
}
