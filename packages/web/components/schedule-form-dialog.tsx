'use client';

import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Project, Repo, Workflow } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { RecurrenceFields } from '@/components/recurrence-fields';
import { createWorkflow, getWorkflow, updateWorkflow } from '@/lib/api';
import {
  buildScheduleGraph,
  decodeSchedule,
  DEFAULT_SCHEDULE_FORM,
  scheduleTriggerOf,
  type ScheduleFormValues,
} from '@/lib/schedules';
import { cn } from '@/lib/utils';

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';
const SELECT_CLASS = INPUT_CLASS;

type Props = {
  projects: Project[];
  repos: Repo[];
  /** The full workflow to edit; omit for a fresh create. */
  workflow?: Workflow;
  onClose: () => void;
  onSaved: () => void;
};

export function ScheduleFormDialog({ projects, repos, workflow, onClose, onSaved }: Props) {
  const editing = Boolean(workflow);
  const [values, setValues] = useState<ScheduleFormValues>(() =>
    workflow ? decodeSchedule(workflow) : DEFAULT_SCHEDULE_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const set = <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const canSave = values.name.trim() && values.prompt.trim() && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const trigger = scheduleTriggerOf(values);
      // Build (or rebuild) the workflow first so we know the trigger node's id, then
      // persist the graph + enabled flag in one update. Create seeds a trigger node.
      const target: Workflow = workflow ?? (await createWorkflow({ name: values.name.trim(), trigger }));
      // A freshly-created workflow's nodes aren't returned by createWorkflow's slim
      // response in all cases — refetch to get the seeded trigger node for edit-safety.
      const full = workflow ?? (await getWorkflow(target.id));
      const graph = buildScheduleGraph(full, values);
      await updateWorkflow(target.id, {
        name: values.name.trim(),
        trigger,
        enabled: values.enabled,
        nodes: graph.nodes,
        edges: graph.edges,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save schedule');
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={saving ? undefined : onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit schedule' : 'New schedule'}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{editing ? 'Edit schedule' : 'New schedule'}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <label htmlFor="schedule-name" className="text-xs font-medium text-muted-foreground">
                Name
              </label>
              <input
                id="schedule-name"
                className={INPUT_CLASS}
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Daily standup"
                autoFocus
                disabled={saving}
              />
            </div>

            <RecurrenceFields
              cron={values.cron}
              timezone={values.timezone}
              onChange={({ cron, timezone }) => setValues((p) => ({ ...p, cron, timezone }))}
              disabled={saving}
            />

            <div className="space-y-1.5">
              <label htmlFor="schedule-prompt" className="text-xs font-medium text-muted-foreground">
                Task prompt
              </label>
              <textarea
                id="schedule-prompt"
                className={cn(INPUT_CLASS, 'h-auto resize-y leading-relaxed')}
                rows={3}
                value={values.prompt}
                onChange={(e) => set('prompt', e.target.value)}
                placeholder="What should the agent do each time? (supports {{expressions}})"
                disabled={saving}
              />
            </div>

            <div className="flex gap-2">
              {projects.length > 0 ? (
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="schedule-project" className="text-xs font-medium text-muted-foreground">
                    Project
                  </label>
                  <select
                    id="schedule-project"
                    className={SELECT_CLASS}
                    value={values.projectId}
                    onChange={(e) => set('projectId', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {repos.length > 0 ? (
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="schedule-repo" className="text-xs font-medium text-muted-foreground">
                    Repo
                  </label>
                  <select
                    id="schedule-repo"
                    className={SELECT_CLASS}
                    value={values.repo}
                    onChange={(e) => set('repo', e.target.value)}
                    disabled={saving}
                  >
                    <option value="">Unassigned</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="schedule-priority" className="text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <select
                  id="schedule-priority"
                  className={SELECT_CLASS}
                  value={values.priority}
                  onChange={(e) => set('priority', Number(e.target.value))}
                  disabled={saving}
                >
                  <option value={0}>Low</option>
                  <option value={1}>Normal</option>
                  <option value={2}>High</option>
                  <option value={3}>Urgent</option>
                </select>
              </div>
              <label className="flex flex-1 cursor-pointer items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={values.enabled}
                  onChange={(e) => set('enabled', e.target.checked)}
                  disabled={saving}
                />
                <span className="text-muted-foreground">Enabled</span>
              </label>
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()} disabled={!canSave} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? 'Save schedule' : 'Create schedule'}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
