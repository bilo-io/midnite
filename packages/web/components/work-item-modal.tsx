'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, X } from 'lucide-react';
import type { Project, SessionSummary, Task, TaskSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { SessionStatusDot } from '@/components/session-card';
import { TaskDetail, type TaskDetailTab } from '@/components/task-detail';
import { SessionPane } from '@/components/session-pane';
import { getSession, getTask, getTasks } from '@/lib/api';

/**
 * Where the modal was opened from. Both tasks and sessions share one id
 * (`session.id === task.id`), so whichever side the user clicked supplies its own
 * data and the modal lazily resolves the counterpart.
 */
export type WorkItemOrigin =
  | { kind: 'task'; task: Task }
  | { kind: 'session'; session: SessionSummary };

type Props = {
  origin: WorkItemOrigin;
  projects: Project[];
  /** The board list — feeds TaskDetail's blocker picker/dependents. Fetched if absent. */
  tasks?: TaskSummary[];
  onClose: () => void;
  /** Hide the Session tab's "Open page" nav (e.g. the office overlay). */
  disableNavigation?: boolean;
  /** Session-scoped actions, wired from the sessions board. */
  onArchiveToggle?: (session: SessionSummary) => void;
  onDelete?: (session: SessionSummary) => void;
};

/**
 * The unified work-item modal (Phase 70): one tabbed overlay serving both tasks
 * and sessions. A `Details` tab (plus `Review`/`Retro` when applicable) carries
 * the task surface; a `Session` tab carries the live terminal / transcript. It
 * opens on whichever tab matches where it was launched from, and is reachable
 * from both the tasks board and the sessions board.
 *
 * Portals to <body>: the boards render inside `.page-reveal`, whose card-rise
 * animation leaves a persisted `transform` on an ancestor that would otherwise
 * become the containing block for `position: fixed`.
 */
export function WorkItemModal({
  origin,
  projects,
  tasks: tasksProp,
  onClose,
  disableNavigation = false,
  onArchiveToggle,
  onDelete,
}: Props) {
  const router = useRouter();
  const id = origin.kind === 'task' ? origin.task.id : origin.session.id;

  const [task, setTask] = useState<Task | null>(origin.kind === 'task' ? origin.task : null);
  const [session, setSession] = useState<SessionSummary | null>(
    origin.kind === 'session' ? origin.session : null,
  );
  const [sessionLoading, setSessionLoading] = useState(origin.kind === 'task');
  const [tasks, setTasks] = useState<TaskSummary[]>(tasksProp ?? []);
  const [tab, setTab] = useState<TaskDetailTab>(origin.kind === 'session' ? 'session' : 'details');

  // Resolve the counterpart the origin didn't supply. A missing counterpart
  // (a task that never ran; a session with no linked task) is not an error —
  // it becomes an empty state on that tab.
  useEffect(() => {
    if (origin.kind === 'task') return;
    const ctrl = new AbortController();
    getTask(id, ctrl.signal)
      .then((t) => setTask(t))
      .catch(() => setTask(null));
    return () => ctrl.abort();
  }, [id, origin.kind]);

  useEffect(() => {
    if (origin.kind === 'session') return;
    const ctrl = new AbortController();
    setSessionLoading(true);
    getSession(id, ctrl.signal)
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setSessionLoading(false));
    return () => ctrl.abort();
  }, [id, origin.kind]);

  // Only fetch the board list when a caller didn't hand one down.
  useEffect(() => {
    if (tasksProp) {
      setTasks(tasksProp);
      return;
    }
    let cancelled = false;
    getTasks()
      .then((list) => {
        if (!cancelled) setTasks(list);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tasksProp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const title = task?.title ?? session?.title ?? 'Work item';

  const sessionSlot = (
    <SessionPane
      session={session}
      loading={sessionLoading}
      onArchiveToggle={onArchiveToggle && session ? () => onArchiveToggle(session) : undefined}
      onDelete={onDelete && session ? () => onDelete(session) : undefined}
    />
  );

  // Session-only shell (no linked task) has no tab strip to host "Open page", so
  // it carries its own — unless navigation is suppressed (e.g. the office).
  const openSessionPage = () => {
    if (!session) return;
    onClose();
    router.push(`/sessions/view?id=${encodeURIComponent(session.id)}`);
  };

  return createPortal(
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
          aria-label={title}
          // At least 6xl wide so the embedded terminal has room to render at a
          // sensible column count — narrower and long lines wrap awkwardly.
          className="pointer-events-auto flex h-[85vh] max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {task ? (
            <TaskDetail
              task={task}
              projects={projects}
              tasks={tasks}
              onClose={onClose}
              variant="modal"
              tab={tab}
              onTabChange={setTab}
              sessionSlot={sessionSlot}
              disableNavigation={disableNavigation}
            />
          ) : (
            // Session with no linked task — no task surface to show, so the modal
            // degrades to a session-only shell (still portaled, still Esc-closable).
            <>
              <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
                {session ? <SessionStatusDot status={session.status} /> : null}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex shrink-0 items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Session
                    </span>
                    {session ? <span className="truncate font-mono">{session.projectDisplay}</span> : null}
                  </div>
                </div>
                {session && !disableNavigation ? (
                  <Button type="button" variant="secondary" size="sm" onClick={openSessionPage}>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Open page
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </header>
              {sessionSlot}
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
