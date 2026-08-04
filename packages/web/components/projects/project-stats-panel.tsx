'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, ArchiveRestore, Hammer, Loader2, Play, Trash2 } from 'lucide-react';
import type { Project, Status, TaskSummary } from '@midnite/shared';
import { ExportMenu } from '@/components/export-menu';
import { ProjectProgressBar } from '@/components/project-progress';
import { RunCommandModal } from '@/components/run-command-modal';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { ALL_COLUMNS, statusHueVar } from '@/components/task-columns';
import { useStatusLabel } from '@/lib/i18n-labels';
import { buildProject, deleteProject, exportProjectMarkdown, previewProject, updateProject } from '@/lib/api';

type Props = {
  project: Project;
  /** The project's tasks (already filtered) — drives the status breakdown. */
  tasks: TaskSummary[];
  /** Re-hydrate the project after archive/unarchive. */
  onSaved: () => void;
  /** Navigate away after the project is deleted. */
  onDeleted: () => void;
};

/**
 * Left rail (Phase 55 C): task counts by status + quick actions (export,
 * archive/unarchive, delete). Counts are derived from the tasks already fetched
 * — no new endpoint. Actions all use existing endpoints.
 */
export function ProjectStatsPanel({ project, tasks, onSaved, onDeleted }: Props) {
  const t = useTranslations('projects');
  const statusLabel = useStatusLabel();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<'archive' | 'delete' | null>(null);
  const [running, setRunning] = useState<'preview' | 'build' | null>(null);

  const done = tasks.filter((t) => t.status === 'done').length;
  const counts = ALL_COLUMNS.map((c) => ({ status: c.status as Status, count: tasks.filter((t) => t.status === c.status).length })).filter(
    (r) => r.count > 0,
  );

  const toggleArchive = async () => {
    setBusy('archive');
    try {
      await updateProject(project.id, { archived: !project.archived });
      onSaved();
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('stats.deleteConfirmTitle'),
      description: t('stats.deleteConfirmDescription', { name: project.name }),
      confirmLabel: t('stats.deleteProject'),
    });
    if (!ok) return;
    setBusy('delete');
    try {
      await deleteProject(project.id);
      onDeleted();
    } catch {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">{t('stats.tasks')}</span>
          <span className="text-sm font-semibold tabular-nums">
            {tasks.length}
            {tasks.length > 0 ? (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {t('stats.doneSuffix', { count: done })}
              </span>
            ) : null}
          </span>
        </div>
        <ProjectProgressBar done={done} total={tasks.length} hideLabel />
        {counts.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">{t('stats.noTasks')}</p>
        ) : (
          <ul className="space-y-1">
            {counts.map(({ status, count }) => (
              <li key={status} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `hsl(var(${statusHueVar(status)}))` }}
                />
                <span className="min-w-0 flex-1 text-muted-foreground">{statusLabel(status)}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick actions */}
      <div className="space-y-1.5 border-t border-border/60 pt-3">
        <span className="text-xs font-medium text-muted-foreground">{t('stats.actions')}</span>
        <div className="flex flex-col gap-1.5">
          {project.startCommand?.trim() ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRunning('preview')}
              className="justify-start gap-2"
            >
              <Play className="h-4 w-4" />
              {t('stats.preview')}
            </Button>
          ) : null}
          {project.buildCommand?.trim() ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRunning('build')}
              className="justify-start gap-2"
            >
              <Hammer className="h-4 w-4" />
              {t('stats.build')}
            </Button>
          ) : null}
          <ExportMenu
            filename={`${(project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`}
            title={project.name}
            fetchMarkdown={() => exportProjectMarkdown(project.id)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void toggleArchive()}
            disabled={busy !== null}
            className="justify-start gap-2"
          >
            {busy === 'archive' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : project.archived ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            {project.archived ? t('stats.unarchive') : t('stats.archive')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void remove()}
            disabled={busy !== null}
            className="justify-start gap-2 text-destructive hover:text-destructive"
          >
            {busy === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {t('stats.deleteProject')}
          </Button>
        </div>
      </div>

      {running === 'preview' ? (
        <RunCommandModal
          title={t('stats.preview')}
          start={() => previewProject(project.id)}
          onClose={() => setRunning(null)}
        />
      ) : null}
      {running === 'build' ? (
        <RunCommandModal
          title={t('stats.build')}
          start={() => buildProject(project.id)}
          onClose={() => setRunning(null)}
        />
      ) : null}
    </div>
  );
}
