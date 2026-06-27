'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sprout, X } from 'lucide-react';
import type { Breakdown } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { BreakdownEditor } from '@/components/breakdown-editor';
import { previewPhaseDocSeed, seedPhaseDocTasks } from '@/lib/api';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

type Props = {
  projectId: string;
  repoId: string;
  filename: string;
  /** Called with the number of tasks created once seeding succeeds. */
  onSeeded: (count: number) => void;
  onClose: () => void;
};

/**
 * Phase 42 Theme D — preview the tasks a phase doc would seed, let the user curate
 * them (reusing the Phase 28 `BreakdownEditor`), then create them as project-linked,
 * dependency-wired, anchor-tagged tasks.
 */
export function SeedTasksModal({ projectId, repoId, filename, onSeeded, onClose }: Props) {
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    previewPhaseDocSeed(projectId, repoId, filename)
      .then((res) => {
        if (!live) return;
        setBreakdown(res.breakdown);
        setIsFallback(res.isFallback);
      })
      .catch((e) => live && setError(errMsg(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [projectId, repoId, filename]);

  const confirm = async () => {
    if (!breakdown || breakdown.tasks.length === 0) return;
    setSeeding(true);
    setError(null);
    try {
      const created = await seedPhaseDocTasks(projectId, filename, breakdown);
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
          aria-label={`Seed tasks from ${filename}`}
          className="pointer-events-auto flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <Sprout className="h-4 w-4 text-primary" />
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">Seed tasks — {filename}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Parsing the phase doc…
              </p>
            ) : error && !breakdown ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : breakdown && taskCount > 0 ? (
              <div className="space-y-3">
                {isFallback ? (
                  <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Extracted from checkboxes without the planning model — edit freely before seeding.
                  </p>
                ) : null}
                <BreakdownEditor breakdown={breakdown} onChange={setBreakdown} />
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks found in this doc — add some <code>- [ ]</code> items first.
              </p>
            )}
          </div>

          <footer className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
            <span className="text-xs text-muted-foreground">
              {taskCount > 0 ? `${taskCount} task${taskCount === 1 ? '' : 's'}` : null}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={() => void confirm()} disabled={seeding || taskCount === 0}>
                {seeding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sprout className="mr-1 h-4 w-4" />}
                Seed {taskCount > 0 ? taskCount : ''} task{taskCount === 1 ? '' : 's'}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
