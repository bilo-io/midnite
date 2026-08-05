'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, X } from 'lucide-react';
import { TASK_KINDS, type Breakdown, type BreakdownTask, type TaskKind } from '@midnite/shared';
import { Input } from '@/components/ui/input';
import { StyledSelect } from '@/components/ui/styled-select';
import { Button } from '@/components/ui/button';
import { useKindLabel } from '@/lib/i18n-labels';

/**
 * The four scheduling bands, as the *data* (`task.priority` 0–3) — the human wording
 * comes from `board.priority.*` at the call site, the same keys `PrioritySelect` and
 * the task card render, so the three surfaces can't word a band differently.
 */
const PRIORITY_KEYS = ['low', 'normal', 'high', 'urgent'] as const;

type Props = {
  breakdown: Breakdown;
  /** Emit the next breakdown on any edit (controlled). */
  onChange: (next: Breakdown) => void;
};

/**
 * Editable preview of a structured, dependency-aware breakdown (Phase 28 Theme C).
 * Each task row is inline-editable (title · kind · priority) and carries its
 * blockers as removable chips plus an "add blocker" picker of sibling tasks.
 * Pruning a task also strips it from every other task's `dependsOn`. Cycles are
 * left to the gateway to prune on create — the client only blocks self-refs and
 * duplicate edges at the picker.
 */
export function BreakdownEditor({ breakdown, onChange }: Props) {
  const t = useTranslations('plan');
  const tc = useTranslations('common');
  const tBoard = useTranslations('board');
  const kindLabel = useKindLabel();
  const tasks = breakdown.tasks;
  const kindOptions = TASK_KINDS.map((k) => ({ value: k, label: kindLabel(k) }));
  const priorityOptions = PRIORITY_KEYS.map((key, i) => ({
    value: String(i),
    label: tBoard(`priority.${key}`),
  }));
  const titleByRef = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) m.set(t.ref, t.title);
    return m;
  }, [tasks]);

  const patch = (ref: string, fields: Partial<BreakdownTask>) => {
    onChange({ tasks: tasks.map((t) => (t.ref === ref ? { ...t, ...fields } : t)) });
  };

  const removeTask = (ref: string) => {
    onChange({
      tasks: tasks
        .filter((t) => t.ref !== ref)
        .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== ref) })),
    });
  };

  const addEdge = (ref: string, blockerRef: string) => {
    const task = tasks.find((t) => t.ref === ref);
    if (!task || blockerRef === ref || task.dependsOn.includes(blockerRef)) return;
    patch(ref, { dependsOn: [...task.dependsOn, blockerRef] });
  };

  const removeEdge = (ref: string, blockerRef: string) => {
    const task = tasks.find((t) => t.ref === ref);
    if (!task) return;
    patch(ref, { dependsOn: task.dependsOn.filter((d) => d !== blockerRef) });
  };

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('breakdown.empty')}</p>;
  }

  return (
    <ul className="space-y-3" aria-label={t('breakdown.listAria')}>
      {tasks.map((task) => {
        const available = tasks.filter(
          (t) => t.ref !== task.ref && !task.dependsOn.includes(t.ref),
        );
        return (
          <li
            key={task.ref}
            className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3"
          >
            <div className="flex items-start gap-2">
              <Input
                value={task.title}
                aria-label={t('breakdown.titleAria', { ref: task.ref })}
                onChange={(e) => patch(task.ref, { title: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tc('removeNamed', { name: task.title })}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeTask(task.ref)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StyledSelect
                aria-label={t('breakdown.kindAria', { title: task.title })}
                options={kindOptions}
                value={(task.kind ?? 'unknown') as TaskKind}
                onChange={(value) => patch(task.ref, { kind: value })}
                className="w-32"
              />
              <StyledSelect
                aria-label={t('breakdown.priorityAria', { title: task.title })}
                options={priorityOptions}
                value={String(task.priority ?? 1)}
                onChange={(value) => patch(task.ref, { priority: Number(value) })}
                className="w-32"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{t('breakdown.blockedByLabel')}</span>
              {task.dependsOn.length === 0 ? (
                <span className="text-xs text-muted-foreground">{t('breakdown.noBlockers')}</span>
              ) : (
                task.dependsOn.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                  >
                    {titleByRef.get(d) ?? d}
                    <button
                      type="button"
                      aria-label={t('breakdown.removeBlockerAria', {
                        blocker: titleByRef.get(d) ?? d,
                        title: task.title,
                      })}
                      onClick={() => removeEdge(task.ref, d)}
                      className="rounded-full hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))
              )}
              {available.length > 0 ? (
                <StyledSelect
                  aria-label={t('breakdown.addBlockerAria', { title: task.title })}
                  options={[
                    {
                      value: '',
                      label: t('breakdown.addBlockerOption'),
                      icon: <Plus className="h-3 w-3" />,
                    },
                    ...available.map((t) => ({ value: t.ref, label: t.title })),
                  ]}
                  value=""
                  onChange={(value) => value && addEdge(task.ref, value)}
                  className="w-40"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
