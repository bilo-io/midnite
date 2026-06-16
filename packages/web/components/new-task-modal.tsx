'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Project, Status, Task } from '@midnite/shared';
import { createTask } from '@/lib/api';
import { Button } from '@/components/ui/button';

type Props = {
  projects: Project[];
  defaultStatus?: Status;
  onCreated: (task: Task) => void;
  onClose: () => void;
};

export function NewTaskModal({ projects, defaultStatus = 'todo', onCreated, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async () => {
    const prompt = title.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('prompt', prompt);
      form.append('status', status);
      if (projectId) form.append('projectId', projectId);
      const { task } = await createTask(form);
      onCreated(task);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task');
      setBusy(false);
    }
  };

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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                disabled={busy}
              />
            </div>

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
              <div className={projects.length > 0 ? 'w-32' : 'flex-1'}>
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
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <footer className="flex justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void submit()} disabled={!title.trim() || busy} className="gap-1.5">
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create task
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
