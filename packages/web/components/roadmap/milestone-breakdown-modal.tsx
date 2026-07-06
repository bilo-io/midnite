'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import type { Breakdown } from '@midnite/shared';
import { createTasksFromBreakdown, draftBreakdownFromGoal } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { BreakdownEditor } from '@/components/breakdown-editor';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  projectId: string;
  milestoneId: string;
  milestoneName: string;
  /** Called with the number of tasks created + assigned to the milestone. */
  onSeeded: (count: number) => void;
  onClose: () => void;
};

/**
 * Phase 58 F — seed a milestone's tasks from a freeform goal. Drafts a
 * dependency-aware breakdown (`POST /tasks/breakdown`), lets the user curate it in
 * the shared {@link BreakdownEditor}, then creates the tasks project-linked and
 * assigned to this milestone (`create-from-breakdown` with `milestoneId`).
 */
export function MilestoneBreakdownModal({ projectId, milestoneId, milestoneName, onSeeded, onClose }: Props) {
  const [goal, setGoal] = useState('');
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const draft = async () => {
    if (!goal.trim()) return;
    setDrafting(true);
    setError(null);
    try {
      const res = await draftBreakdownFromGoal(goal.trim(), projectId);
      setBreakdown(res.breakdown);
      setIsFallback(res.isFallback);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDrafting(false);
    }
  };

  const confirm = async () => {
    if (!breakdown || breakdown.tasks.length === 0) return;
    setSeeding(true);
    setError(null);
    try {
      const created = await createTasksFromBreakdown(projectId, breakdown, { milestoneId });
      onSeeded(created.length);
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSeeding(false);
    }
  };

  const taskCount = breakdown?.tasks.length ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-background/40 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Generate tasks for ${milestoneName}`}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Generate tasks — {milestoneName}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {!breakdown ? (
              <div className="space-y-3">
                <label htmlFor="milestone-goal" className="block text-sm text-muted-foreground">
                  Describe what this milestone should accomplish — the planner drafts a dependency-aware task list you can edit before it lands.
                </label>
                <textarea
                  id="milestone-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={4}
                  placeholder="e.g. Ship the public API: auth, rate limiting, docs, and a client SDK"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {isFallback ? (
                  <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Drafted without the planning model — edit freely before creating.
                  </p>
                ) : null}
                <BreakdownEditor breakdown={breakdown} onChange={setBreakdown} />
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {!breakdown ? (
              <Button type="button" onClick={() => void draft()} disabled={drafting || !goal.trim()}>
                {drafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Draft tasks
              </Button>
            ) : (
              <Button type="button" onClick={() => void confirm()} disabled={seeding || taskCount === 0}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create {taskCount} task{taskCount === 1 ? '' : 's'}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}
