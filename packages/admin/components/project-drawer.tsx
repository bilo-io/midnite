'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@midnite/ui';
import { STATUSES, projectCompletion, type Project } from '@midnite/shared';
import { getProjectDetail } from '@/lib/api';
import { ErrorState, LoadingRows } from '@/components/query-states';
import { ProgressBar } from '@/components/progress-bar';
import { formatDate, formatInt } from '@/lib/format';

/**
 * A per-project drill-in (Phase 73 Theme F). Opens `GET /projects/:id` for the
 * full record — completion, per-status task counts, the configured work dir and
 * phase-doc sync repo — rendered as a right-side slide-over portal over the table.
 * Seeded with the list row so identity shows instantly while the detail loads.
 */
export function ProjectDrawer({ project, onClose }: { project: Project; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const detail = useQuery({
    queryKey: ['admin', 'projects', 'detail', project.id],
    queryFn: ({ signal }) => getProjectDetail(project.id, signal),
    // The clicked list row seeds identity instantly; `placeholderData` (unlike
    // `initialData`) is never cached, so the full `/projects/:id` read still fires
    // despite the client's 30s `staleTime`.
    placeholderData: project,
  });

  if (typeof document === 'undefined') return null;

  const p = detail.data ?? project;
  const completion = projectCompletion(p);
  const counts = p.taskStatusCounts ?? {};

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${p.name}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: p.color }}
              aria-hidden
            />
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="truncate text-lg font-semibold text-foreground">{p.name}</h2>
              <p className="truncate font-mono text-xs text-muted-foreground">#{p.tag}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        {p.description ? <p className="text-sm text-muted-foreground">{p.description}</p> : null}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">Completion</span>
            <span className="tabular-nums text-foreground">
              {completion.done}/{completion.total} · {completion.pct}%
            </span>
          </div>
          <ProgressBar pct={completion.pct} />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Tasks by status</h3>
          {detail.isError ? (
            <ErrorState error={detail.error} />
          ) : detail.isPending ? (
            <LoadingRows count={3} />
          ) : completion.total === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned to this project yet.</p>
          ) : (
            <dl className="grid grid-cols-3 gap-2 text-sm">
              {STATUSES.map((status) => (
                <div key={status} className="rounded-md border border-border/60 px-2 py-1.5">
                  <dt className="text-xs capitalize text-muted-foreground">{status}</dt>
                  <dd className="tabular-nums text-foreground">{formatInt(counts[status] ?? 0)}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Work dir</dt>
            <dd className="truncate font-mono text-xs text-foreground">{p.workDir || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Phase-doc sync repo</dt>
            <dd className="truncate font-mono text-xs text-foreground">{p.phaseDocSyncRepoId || '—'}</dd>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Created</dt>
              <dd className="text-foreground">{formatDate(p.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Updated</dt>
              <dd className="text-foreground">{formatDate(p.updatedAt)}</dd>
            </div>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Project id</dt>
            <dd className="truncate font-mono text-xs text-foreground">{p.id}</dd>
          </div>
        </dl>
      </aside>
    </div>,
    document.body,
  );
}
