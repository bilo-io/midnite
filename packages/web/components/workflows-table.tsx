'use client';

import Link from 'next/link';
import { Workflow } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TriggerType, WorkflowSummary } from '@midnite/shared';
import { SelectableIcon } from '@/components/selectable-icon';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import { LastRunStatus, WorkflowEnabledSwitch } from '@/components/workflow-controls';
import { cronIntervalSeconds, describeCron, describeFrequency } from '@/lib/cron';
import { cn } from '@/lib/utils';

// One accordion per trigger type. Sections are collapsible + reorderable (persisted),
// matching the Tasks/Projects tables. Shared with the grid/list views. The visible
// label is looked up per-render from `workflows.list.triggers.<type>` so it follows
// the active locale — only the machine-facing `type` + accent `hue` live here.
export const TRIGGER_SECTIONS: Array<{ type: TriggerType; hue: string }> = [
  { type: 'manual', hue: 'var(--status-backlog)' },
  { type: 'schedule', hue: 'var(--status-todo)' },
  { type: 'webhook', hue: 'var(--kind-feature)' },
  { type: 'task-event', hue: 'var(--status-done)' },
];

function WorkflowRow({
  w,
  selected = false,
  onToggleSelect,
}: {
  w: WorkflowSummary;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
}) {
  const t = useTranslations('workflows');
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
              {t('list.archived')}
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
          title={t('list.cronTooltip', {
            frequency: describeFrequency(w.cron),
            schedule: describeCron(w.cron),
          })}
        >
          {w.cron}
        </span>
      ) : null}
      <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground md:block">
        {t('list.nodeCount', { count: w.nodeCount })}
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
  const t = useTranslations('workflows');

  const sections: AccordionSection[] = TRIGGER_SECTIONS.map(({ type, hue }) => {
    const label = t(`list.triggers.${type}`);
    let items = workflows.filter((w) => w.triggerType === type);
    let summary =
      items.length === 0 ? t('list.section.empty') : t('list.section.count', { count: items.length });

    if (type === 'schedule') {
      // Most frequent (smallest interval) first.
      items = [...items].sort(
        (a, b) => cronIntervalSeconds(a.cron ?? '') - cronIntervalSeconds(b.cron ?? ''),
      );
      if (items.length > 0) summary = t('list.section.mostFrequentFirst', { count: items.length });
    }

    return {
      id: `trigger-${type}`,
      label,
      hue,
      count: items.length,
      summary,
      body:
        items.length === 0 ? (
          <div className="px-3 py-3 text-xs text-muted-foreground">
            {t('list.noneForTrigger', { trigger: label.toLowerCase() })}
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

  return <SortableAccordions sections={sections} storageKey="midnite.workflows.sections" variant="split" />;
}
