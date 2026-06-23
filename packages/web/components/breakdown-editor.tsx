'use client';

import { useMemo } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { TASK_KINDS, type Breakdown, type BreakdownTask, type TaskKind } from '@midnite/shared';
import { Input } from '@/components/ui/input';
import { StyledSelect } from '@/components/ui/styled-select';
import { Button } from '@/components/ui/button';

const KIND_OPTIONS = TASK_KINDS.map((k) => ({ value: k, label: k }));

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: '0', label: 'Low' },
  { value: '1', label: 'Normal' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Urgent' },
];

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
  const tasks = breakdown.tasks;
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
    return (
      <p className="text-sm text-muted-foreground">No tasks in this breakdown yet.</p>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Breakdown tasks">
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
                aria-label={`Title for ${task.ref}`}
                onChange={(e) => patch(task.ref, { title: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${task.title}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeTask(task.ref)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StyledSelect
                aria-label={`Kind for ${task.title}`}
                options={KIND_OPTIONS}
                value={(task.kind ?? 'unknown') as TaskKind}
                onChange={(value) => patch(task.ref, { kind: value })}
                className="w-32"
              />
              <StyledSelect
                aria-label={`Priority for ${task.title}`}
                options={PRIORITY_OPTIONS}
                value={String(task.priority ?? 1)}
                onChange={(value) => patch(task.ref, { priority: Number(value) })}
                className="w-32"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Blocked by:</span>
              {task.dependsOn.length === 0 ? (
                <span className="text-xs text-muted-foreground/70">nothing</span>
              ) : (
                task.dependsOn.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                  >
                    {titleByRef.get(d) ?? d}
                    <button
                      type="button"
                      aria-label={`Remove blocker ${titleByRef.get(d) ?? d} from ${task.title}`}
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
                  aria-label={`Add blocker for ${task.title}`}
                  options={[
                    { value: '', label: 'Add blocker…', icon: <Plus className="h-3 w-3" /> },
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
