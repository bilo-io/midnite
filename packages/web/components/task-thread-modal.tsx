'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ExternalLink, Plus, SquareTerminal, X } from 'lucide-react';
import {
  SOURCE_KIND_LABEL,
  parseGithubPr,
  parseGithubRepo,
  type Project,
  type Status,
  type Task,
  type TaskEvent,
  type TaskLink,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ProjectSelect } from '@/components/project-select';
import { SourceIcon } from '@/components/source-icon';
import { DeleteConfirmButton } from '@/components/delete-confirm-button';
import { useConfirm } from '@/components/confirm-dialog';
import {
  addTaskLink,
  deleteTask,
  gatewayUrl,
  removeTaskLink,
  updateTaskProject,
  updateTaskStatus,
} from '@/lib/api';

const STATUS_HUE_VAR: Record<Status, string> = {
  backlog: '--status-backlog',
  todo: '--status-todo',
  wip: '--status-wip',
  waiting: '--status-waiting',
  done: '--status-done',
  abandoned: '--status-abandoned',
};

const STATUS_LABEL: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'Todo',
  wip: 'In progress',
  waiting: 'Waiting',
  done: 'Done',
  abandoned: 'Abandoned',
};

const KIND_LABEL: Record<NonNullable<Task['kind']>, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};

const KIND_HUE_VAR: Record<NonNullable<Task['kind']>, string> = {
  bug: '--kind-bug',
  feature: '--kind-feature',
  question: '--kind-question',
  chore: '--kind-chore',
  unknown: '--kind-unknown',
};

type Props = {
  task: Task;
  projects: Project[];
  onClose: () => void;
};

export function TaskThreadModal({ task, projects, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const kind = task.kind ?? 'unknown';
  const statusHue = STATUS_HUE_VAR[task.status];
  const images = task.attachments?.filter((a) => a.mime.startsWith('image/')) ?? [];

  const router = useRouter();
  const confirm = useConfirm();
  const [links, setLinks] = useState<TaskLink[]>(task.links ?? []);
  const [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(task.projectId ?? null);
  const [projectBusy, setProjectBusy] = useState(false);

  const reassign = async (next: string | null) => {
    const prev = projectId;
    setProjectId(next); // optimistic
    setProjectBusy(true);
    setStatusError(null);
    try {
      await updateTaskProject(task.id, next);
      router.refresh();
    } catch (e) {
      setProjectId(prev); // roll back
      setStatusError(e instanceof Error ? e.message : 'Failed to change project');
    } finally {
      setProjectBusy(false);
    }
  };

  // session.id === task.id; deep-link into the sessions board, which auto-opens it.
  const goToSession = () => {
    onClose();
    router.push(`/sessions?open=${encodeURIComponent(task.id)}`);
  };

  const abandon = async () => {
    const ok = await confirm({
      title: 'Abandon this task?',
      description: 'It will be archived and its session stopped. You can permanently delete it afterwards.',
      confirmLabel: 'Abandon',
    });
    if (!ok) return;
    setStatusBusy(true);
    setStatusError(null);
    try {
      await updateTaskStatus(task.id, 'abandoned'); // gateway auto-archives the session
      router.refresh();
      onClose();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to abandon task');
    } finally {
      setStatusBusy(false);
    }
  };

  // Permanent delete — only offered once the task is archived (e.g. abandoned).
  const remove = async () => {
    setStatusBusy(true);
    setStatusError(null);
    try {
      await deleteTask(task.id);
      router.refresh();
      onClose();
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Failed to delete task');
      setStatusBusy(false);
    }
  };

  const addLink = async () => {
    const url = linkUrl.trim();
    if (!url) return;
    try {
      new URL(url);
    } catch {
      setLinkError('Enter a full URL, including https://');
      return;
    }
    setBusy(true);
    setLinkError(null);
    try {
      const updated = await addTaskLink(task.id, url);
      setLinks(updated.links ?? []);
      setLinkUrl('');
      router.refresh();
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to add link');
    } finally {
      setBusy(false);
    }
  };

  const removeLink = async (linkId: string) => {
    const ok = await confirm({
      title: 'Remove this link?',
      description: 'It will be detached from this task.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setBusy(true);
    setLinkError(null);
    try {
      const updated = await removeTaskLink(task.id, linkId);
      setLinks(updated.links ?? []);
      router.refresh();
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to remove link');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={task.title}
          className="pointer-events-auto flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                background: `hsl(var(${statusHue}))`,
                boxShadow: `0 0 8px -1px hsl(var(${statusHue}) / 0.7)`,
              }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">{task.title}</h2>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    background: `hsl(var(${KIND_HUE_VAR[kind]}) / 0.12)`,
                    color: `hsl(var(${KIND_HUE_VAR[kind]}))`,
                  }}
                >
                  {KIND_LABEL[kind]}
                </span>
                <span className="shrink-0">{STATUS_LABEL[task.status]}</span>
                {task.repo ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate font-mono">{task.repo}</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {projects.length > 0 ? (
                <ProjectSelect
                  projects={projects}
                  value={projectId}
                  onChange={(next) => void reassign(next)}
                  disabled={projectBusy}
                  align="right"
                />
              ) : null}
              <Button type="button" variant="secondary" size="sm" onClick={goToSession}>
                <SquareTerminal className="h-3.5 w-3.5" />
                Session
              </Button>
              {task.status !== 'abandoned' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => void abandon()}
                  disabled={statusBusy}
                  aria-label="Abandon task"
                  title="Abandon"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Ban className="h-4 w-4" />
                </Button>
              ) : null}
              {task.archivedAt ? (
                <DeleteConfirmButton noun="task" onConfirm={() => void remove()} />
              ) : null}
              <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {statusError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {statusError}
              </div>
            ) : null}
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Review &amp; links
              </h3>
              {links.length > 0 ? (
                <ul className="mb-2 space-y-1.5">
                  {links.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                    >
                      <SourceIcon kind={link.kind} className="shrink-0 text-foreground/80" />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-w-0 flex-1 items-center gap-1 text-sm hover:underline"
                      >
                        <span className="truncate">{linkLabel(link)}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void removeLink(link.id)}
                        disabled={busy}
                        aria-label="Remove link"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2 text-sm text-muted-foreground">No links yet.</p>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addLink();
                    }
                  }}
                  placeholder="Paste a GitHub PR, Figma, Google Docs, or Notion link"
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => void addLink()}
                  disabled={busy || !linkUrl.trim()}
                  aria-label="Add link"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {linkError ? <p className="mt-1.5 text-xs text-destructive">{linkError}</p> : null}
            </section>

            {task.prompt ? (
              <section>
                <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Prompt
                </h3>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  {task.prompt}
                </p>
              </section>
            ) : null}

            {images.length > 0 ? (
              <section>
                <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Attachments
                </h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {images.map((a) => (
                    <img
                      key={a.id}
                      src={`${gatewayUrl()}/uploads/${a.path}`}
                      alt={a.originalName ?? ''}
                      className="max-h-32 w-full rounded border object-cover"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Activity
              </h3>
              <Timeline events={task.events} />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function Timeline({ events }: { events: TaskEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((ev, idx) => (
        <li key={idx} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
            {idx < events.length - 1 ? (
              <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm font-medium leading-snug">{ev.kind}</p>
            <p className="text-[11px] text-muted-foreground">{formatTime(ev.at)}</p>
            {ev.data && Object.keys(ev.data).length > 0 ? (
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {JSON.stringify(ev.data, null, 2)}
              </pre>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function linkLabel(link: TaskLink): string {
  if (link.label) return link.label;
  if (link.kind === 'github') {
    const pr = parseGithubPr(link.url);
    if (pr) return `${pr.repo} #${pr.prNumber}`;
    const repo = parseGithubRepo(link.url);
    if (repo) return repo;
  }
  try {
    const u = new URL(link.url);
    return `${SOURCE_KIND_LABEL[link.kind]} · ${u.hostname.replace(/^www\./, '')}`;
  } catch {
    return link.url;
  }
}

function formatTime(at: string): string {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return at;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return at;
  }
}
