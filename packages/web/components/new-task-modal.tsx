'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import {
  MAX_BULK_LINES,
  parseBulkLines,
  type BulkCreateTaskResponse,
  type Project,
  type Repo,
  type Status,
  type Task,
} from '@midnite/shared';
import { createBulk, createTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Mode = 'single' | 'bulk';

type Props = {
  projects: Project[];
  /** Registered repos for the picker; an empty list hides the control. */
  repos: Repo[];
  defaultStatus?: Status;
  onCreated: (task: Task) => void;
  /** Called after a bulk batch lands, so the parent can refresh the board. */
  onBulkCreated?: (response: BulkCreateTaskResponse) => void;
  onClose: () => void;
};

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

export function NewTaskModal({
  projects,
  repos,
  defaultStatus = 'todo',
  onCreated,
  onBulkCreated,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>('single');
  const [title, setTitle] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [repo, setRepo] = useState('');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [priority, setPriority] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateTaskResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  // The preview (and the submit guard) parse client-side with the same pure
  // helper the gateway re-runs on the raw text — so "N tasks" matches what lands.
  const parsedLines = useMemo(() => parseBulkLines(bulkText), [bulkText]);
  const overLimit = parsedLines.length > MAX_BULK_LINES;
  const failedRows = result?.results.filter((r) => r.error) ?? [];

  const switchMode = (next: Mode) => {
    if (busy || next === mode) return;
    setMode(next);
    setError(null);
    setResult(null);
  };

  const onBulkTextChange = (value: string) => {
    setBulkText(value);
    // Editing after a run makes the old summary stale — clear it so the footer
    // returns to "Create N tasks" and a fix-and-retry loop works.
    if (result) setResult(null);
  };

  const submit = async () => {
    const prompt = title.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('status', status);
      form.append('priority', String(priority));
      if (projectId) form.append('projectId', projectId);
      if (repo) form.append('repo', repo);
      const { task } = await createTask(form);
      onCreated(task);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
      setBusy(false);
    }
  };

  const submitBulk = async () => {
    if (parsedLines.length === 0 || overLimit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await createBulk({
        raw: bulkText,
        projectId: projectId || undefined,
        repo: repo || undefined,
        priority,
      });
      setResult(response);
      onBulkCreated?.(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tasks');
    } finally {
      setBusy(false);
    }
  };

  const taskWord = (n: number) => `${n} task${n === 1 ? '' : 's'}`;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New task"
          className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">New task</h2>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose} disabled={busy}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="space-y-3 px-5 py-4">
            {/* Single vs bulk toggle */}
            <div role="group" aria-label="Add mode" className="inline-flex rounded-md border border-border/60 bg-card/40 p-0.5">
              {(['single', 'bulk'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  disabled={busy}
                  className={cn(
                    'rounded px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50',
                    mode === m ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'single' ? 'Single' : 'Bulk paste'}
                </button>
              ))}
            </div>

            {mode === 'single' ? (
              <div>
                <label htmlFor="new-task-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Title
                </label>
                <input
                  id="new-task-title"
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                  placeholder="What needs doing?"
                  className={INPUT_CLASS}
                  disabled={busy}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="new-task-bulk" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Tasks
                </label>
                <textarea
                  id="new-task-bulk"
                  value={bulkText}
                  onChange={(e) => onBulkTextChange(e.target.value)}
                  placeholder={'One task per line…\nBlank lines, # comments and - bullets are ignored.'}
                  rows={7}
                  className={cn(INPUT_CLASS, 'h-auto resize-y font-mono leading-relaxed')}
                  disabled={busy}
                />
                <p className={cn('mt-1.5 text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
                  {parsedLines.length === 0
                    ? 'Paste a list to create one task per line.'
                    : overLimit
                      ? `${taskWord(parsedLines.length)} detected — over the ${MAX_BULK_LINES}-line limit.`
                      : `${taskWord(parsedLines.length)} detected.`}
                </p>
                {/* The cleaned prompts (markers stripped, blanks/comments dropped) so the
                    user sees exactly what will be created before submitting. */}
                {parsedLines.length > 0 && !overLimit && !result && (
                  <ul className="mt-1.5 max-h-24 list-disc space-y-0.5 overflow-y-auto rounded-md border border-border/40 bg-background/40 py-2 pl-6 pr-2 text-xs text-muted-foreground">
                    {parsedLines.map((line, i) => (
                      <li key={i} className="truncate">{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {projects.length > 0 && (
                <div className="flex-1">
                  <label htmlFor="new-task-project" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Project
                  </label>
                  <select
                    id="new-task-project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={busy}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Bulk status is decided per task by triage (ready → todo, else backlog),
                  so the status selector only applies to a single create. */}
              {mode === 'single' && (
                <div className={projects.length > 0 ? 'w-28' : 'flex-1'}>
                  <label htmlFor="new-task-status" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Status
                  </label>
                  <select
                    id="new-task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    disabled={busy}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">Todo</option>
                  </select>
                </div>
              )}
              <div className={projects.length > 0 ? 'w-28' : 'flex-1'}>
                <label htmlFor="new-task-priority" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <select
                  id="new-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  disabled={busy}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value={0}>Low</option>
                  <option value={1}>Normal</option>
                  <option value={2}>High</option>
                  <option value={3}>Urgent</option>
                </select>
              </div>
            </div>

            {/* Repo picker — the chosen repo's checkout is where the task's
                session opens (see resolveCwd). "Unassigned" leaves it unset. */}
            {repos.length > 0 && (
              <div>
                <label htmlFor="new-task-repo" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Repo
                </label>
                <select
                  id="new-task-repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={busy}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {result && (
              <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3 text-xs">
                <p className="font-medium">
                  <span className="text-foreground">{result.counts.created} created</span>
                  <span className="text-muted-foreground"> · {result.counts.skipped} skipped · </span>
                  <span className={result.counts.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {result.counts.failed} failed
                  </span>
                </p>
                {failedRows.length > 0 && (
                  <ul className="max-h-32 space-y-1 overflow-y-auto">
                    {failedRows.map((row, i) => (
                      <li key={i} className="text-destructive">
                        <span className="font-mono">{row.line}</span>
                        <span className="text-muted-foreground"> — {row.error}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            {mode === 'single' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void submit()}
                disabled={!title.trim() || busy}
                className="gap-1.5"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Create task
              </Button>
            ) : result ? (
              <Button type="button" size="sm" onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void submitBulk()}
                disabled={parsedLines.length === 0 || overLimit || busy}
                className="gap-1.5"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {parsedLines.length > 0 ? `Create ${taskWord(parsedLines.length)}` : 'Create tasks'}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}
