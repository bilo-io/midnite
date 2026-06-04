'use client';

import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { Status, Task, TaskEvent } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { gatewayUrl } from '@/lib/api';

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
  onClose: () => void;
};

export function TaskThreadModal({ task, onClose }: Props) {
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
          <header className="flex items-start gap-3 border-b border-border/60 px-5 py-3.5">
            <span
              aria-hidden
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                background: `hsl(var(${statusHue}))`,
                boxShadow: `0 0 8px -1px hsl(var(${statusHue}) / 0.7)`,
              }}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold leading-snug">{task.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
                  style={{
                    background: `hsl(var(${KIND_HUE_VAR[kind]}) / 0.12)`,
                    color: `hsl(var(${KIND_HUE_VAR[kind]}))`,
                  }}
                >
                  {KIND_LABEL[kind]}
                </span>
                <span>{STATUS_LABEL[task.status]}</span>
                {task.repo ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{task.repo}</span>
                  </>
                ) : null}
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {task.prUrl ? (
              <a
                href={task.prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View pull request
              </a>
            ) : null}

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

function formatTime(at: string): string {
  const ms = Date.parse(at);
  if (Number.isNaN(ms)) return at;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return at;
  }
}
