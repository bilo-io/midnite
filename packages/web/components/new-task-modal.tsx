'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import {
  MAX_BULK_LINES,
  parseBulkLines,
  type BulkCreateTaskResponse,
  type Project,
  type Repo,
  type Status,
  type Task,
  type TaskSummary,
} from '@midnite/shared';
import { createBulk, createTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TaskPicker } from '@/components/task-picker';
import { cn } from '@/lib/utils';

/** Statuses that make a task useful as a blocker (a done/abandoned task never blocks). */
const BLOCKER_CANDIDATE_STATUSES = new Set<Status>(['backlog', 'todo', 'wip', 'waiting']);

type Mode = 'single' | 'bulk';

type Props = {
  projects: Project[];
  /** Registered repos for the picker; empty hides it (Phase 13 B1). */
  repos: Repo[];
  /** Existing tasks, candidates for the single-mode "Blocked by" picker (Phase 27). */
  tasks?: TaskSummary[];
  defaultStatus?: Status;
  /** Pre-selects the project — e.g. the per-project board's "+" seeds its column's project. */
  defaultProjectId?: string;
  onCreated: (task: Task) => void;
  /** Called after a bulk batch lands, so the parent can refresh the board. */
  onBulkCreated?: (response: BulkCreateTaskResponse) => void;
  onClose: () => void;
};

const INPUT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';
const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

export function NewTaskModal({
  projects,
  repos,
  tasks = [],
  defaultStatus = 'todo',
  defaultProjectId = '',
  onCreated,
  onBulkCreated,
  onClose,
}: Props) {
  const t = useTranslations('board.newTask');
  const tBoard = useTranslations('board');
  const tTask = useTranslations('task');
  const tCommon = useTranslations('common');
  const [mode, setMode] = useState<Mode>('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [repo, setRepo] = useState('');
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [priority, setPriority] = useState(1);
  const [selectedBlockerIds, setSelectedBlockerIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkCreateTaskResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only open tasks make useful blockers; drop ones already chosen.
  const blockerCandidates = useMemo(
    () =>
      tasks.filter(
        (t) => BLOCKER_CANDIDATE_STATUSES.has(t.status) && !selectedBlockerIds.includes(t.id),
      ),
    [tasks, selectedBlockerIds],
  );
  const selectedBlockers = useMemo(
    () => selectedBlockerIds.map((id) => tasks.find((t) => t.id === id)).filter((t): t is TaskSummary => Boolean(t)),
    [selectedBlockerIds, tasks],
  );

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
      const desc = description.trim();
      if (desc) form.append('description', desc);
      form.append('status', status);
      form.append('priority', String(priority));
      if (projectId) form.append('projectId', projectId);
      if (repo) form.append('repo', repo);
      for (const id of selectedBlockerIds) form.append('dependsOn', id);
      const { task } = await createTask(form);
      onCreated(task);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('createFailed'));
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
      setError(e instanceof Error ? e.message : t('createBulkFailed'));
    } finally {
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
          aria-label={t('title')}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-border bg-card shadow-2xl sm:max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t('title')}</h2>
            <Button type="button" variant="ghost" size="icon" aria-label={tCommon('close')} onClick={onClose} disabled={busy}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="space-y-3 px-5 py-4">
            {/* Single vs bulk toggle */}
            <div role="group" aria-label={t('addModeAria')} className="inline-flex rounded-md border border-border/60 bg-card/40 p-0.5">
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
                  {m === 'single' ? t('single') : t('bulk')}
                </button>
              ))}
            </div>

            {mode === 'single' ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="new-task-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('titleLabel')}
                  </label>
                  <input
                    id="new-task-title"
                    ref={inputRef}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
                    placeholder={t('titlePlaceholder')}
                    className={INPUT_CLASS}
                    disabled={busy}
                  />
                </div>
                <div>
                  <label htmlFor="new-task-description" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('descriptionLabel')}
                    <span className="ml-1.5 font-normal text-muted-foreground/70">{t('optional')}</span>
                  </label>
                  <textarea
                    id="new-task-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('descriptionPlaceholder')}
                    rows={3}
                    className={cn(INPUT_CLASS, 'h-auto resize-y leading-relaxed')}
                    disabled={busy}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="new-task-bulk" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t('tasksLabel')}
                </label>
                <textarea
                  id="new-task-bulk"
                  value={bulkText}
                  onChange={(e) => onBulkTextChange(e.target.value)}
                  placeholder={t('bulkPlaceholder')}
                  rows={7}
                  className={cn(INPUT_CLASS, 'h-auto resize-y font-mono leading-relaxed')}
                  disabled={busy}
                />
                <p className={cn('mt-1.5 text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
                  {parsedLines.length === 0
                    ? t('bulkEmptyHint')
                    : overLimit
                      ? t('bulkOverLimit', { count: parsedLines.length, limit: MAX_BULK_LINES })
                      : t('bulkDetected', { count: parsedLines.length })}
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

            {/* Scope + meta selects. Project and repo are orthogonal axes (Phase 13);
                each picker only shows when there's something to pick. All the
                dropdowns share one row on desktop (wrapping to two-up on narrow
                widths); status is single-create only (bulk triage decides it). */}
            <div className="flex flex-wrap gap-2">
              {projects.length > 0 && (
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="new-task-project" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('projectLabel')}
                  </label>
                  <select
                    id="new-task-project"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    disabled={busy}
                    className={SELECT_CLASS}
                  >
                    <option value="">{t('noProject')}</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {repos.length > 0 && (
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="new-task-repo" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('repoLabel')}
                  </label>
                  <select
                    id="new-task-repo"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    disabled={busy}
                    className={SELECT_CLASS}
                  >
                    <option value="">{tBoard('unassigned')}</option>
                    {repos.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Bulk status is decided per task by triage (ready → todo, else backlog),
                  so the status selector only applies to a single create. */}
              {mode === 'single' && (
                <div className="min-w-[8.5rem] flex-1">
                  <label htmlFor="new-task-status" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    {t('statusLabel')}
                  </label>
                  <select
                    id="new-task-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    disabled={busy}
                    className={SELECT_CLASS}
                  >
                    <option value="backlog">{tBoard('columns.backlog')}</option>
                    <option value="todo">{tBoard('columns.todo')}</option>
                  </select>
                </div>
              )}
              <div className="min-w-[8.5rem] flex-1">
                <label htmlFor="new-task-priority" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t('priorityLabel')}
                </label>
                <select
                  id="new-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  disabled={busy}
                  className={SELECT_CLASS}
                >
                  <option value={0}>{tBoard('priority.low')}</option>
                  <option value={1}>{tBoard('priority.normal')}</option>
                  <option value={2}>{tBoard('priority.high')}</option>
                  <option value={3}>{tBoard('priority.urgent')}</option>
                </select>
              </div>
            </div>

            {/* Blocked by: choose existing tasks that must be done first (Phase 27).
                Single-create only — bulk lines can't express per-line dependencies. */}
            {mode === 'single' && tasks.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t('blockedByLabel')}
                </label>
                {selectedBlockers.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {selectedBlockers.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex max-w-full items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        <span className="truncate">{b.title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBlockerIds((ids) => ids.filter((id) => id !== b.id))
                          }
                          aria-label={tTask('dependencies.removeBlocker', { title: b.title })}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          disabled={busy}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <TaskPicker
                  candidates={blockerCandidates}
                  onPick={(picked) => setSelectedBlockerIds((ids) => [...ids, picked.id])}
                  disabled={busy}
                  label={tTask('dependencies.searchLabel')}
                  placeholder={tTask('dependencies.searchPlaceholder')}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {result && (
              <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3 text-xs">
                <p className="font-medium">
                  <span className="text-foreground">{t('createdCount', { count: result.counts.created })}</span>
                  <span className="text-muted-foreground"> · {t('skippedCount', { count: result.counts.skipped })} · </span>
                  <span className={result.counts.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}>
                    {t('failedCount', { count: result.counts.failed })}
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
              {result ? tCommon('close') : tCommon('cancel')}
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
                {t('createTask')}
              </Button>
            ) : result ? (
              <Button type="button" size="sm" onClick={onClose}>
                {t('done')}
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
                {parsedLines.length > 0 ? t('createN', { count: parsedLines.length }) : t('createTasks')}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </>
  );
}
