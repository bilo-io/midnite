'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Loader2,
  Pencil,
  Play,
  PencilRuler,
  Plus,
} from 'lucide-react';
import type { Project, Repo, WorkflowSummary } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { useToast } from '@/components/toast';
import { ScheduleFormDialog } from '@/components/schedule-form-dialog';
import { getWorkflow, runWorkflow, updateWorkflow } from '@/lib/api';
import { cronIntervalSeconds, describeCron, formatRun, nextRuns } from '@/lib/cron';
import { invalidateData } from '@/lib/data-refresh';
import { isScheduleWorkflow } from '@/lib/schedules';
import { cn } from '@/lib/utils';

type Props = {
  initial: WorkflowSummary[];
  projects: Project[];
  repos: Repo[];
};

// The full workflow being edited (fetched on demand), or 'new' for a fresh create.
type Editing = { kind: 'new' } | { kind: 'edit'; id: string } | null;

export function SchedulesView({ initial, projects, repos }: Props) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const [editWorkflow, setEditWorkflow] = useState<Awaited<ReturnType<typeof getWorkflow>> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // The facade only shows schedule-triggered workflows that enqueue a task; sort
  // most-frequent first so the busiest schedules lead (Phase 45 C / Decision §2).
  const schedules = useMemo(
    () =>
      initial
        .filter(isScheduleWorkflow)
        .filter((s) => !s.archived)
        .sort((a, b) => cronIntervalSeconds(a.cron ?? '') - cronIntervalSeconds(b.cron ?? '')),
    [initial],
  );

  const openEdit = async (id: string) => {
    setBusyId(id);
    try {
      const workflow = await getWorkflow(id);
      setEditWorkflow(workflow);
      setEditing({ kind: 'edit', id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to open schedule');
    } finally {
      setBusyId(null);
    }
  };

  const toggleEnabled = async (s: WorkflowSummary) => {
    setBusyId(s.id);
    try {
      await updateWorkflow(s.id, { enabled: !s.enabled });
      invalidateData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update schedule');
    } finally {
      setBusyId(null);
    }
  };

  const runNow = async (s: WorkflowSummary) => {
    setBusyId(s.id);
    try {
      await runWorkflow(s.id);
      toast.success(`Ran “${s.name}” — check the board for the new task.`);
      invalidateData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to run schedule');
    } finally {
      setBusyId(null);
    }
  };

  const closeDialog = () => {
    setEditing(null);
    setEditWorkflow(null);
  };

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">
          {schedules.length} schedule{schedules.length === 1 ? '' : 's'}
        </p>
        <Button type="button" size="sm" onClick={() => setEditing({ kind: 'new' })}>
          <Plus className="h-4 w-4" />
          New schedule
        </Button>
      </div>

      <div className="reveal-content">
        {schedules.length === 0 ? (
          <EmptyState
            Icon={CalendarClock}
            title="No schedules yet"
            description="Create a recurring task — a standup that opens every weekday, a weekly cleanup chore, or anything on a cadence."
            actionLabel="New schedule"
            onAction={() => setEditing({ kind: 'new' })}
          />
        ) : (
          <ul className="space-y-2">
            {schedules.map((s) => (
              <ScheduleRow
                key={s.id}
                schedule={s}
                busy={busyId === s.id}
                onEdit={() => void openEdit(s.id)}
                onToggle={() => void toggleEnabled(s)}
                onRun={() => void runNow(s)}
              />
            ))}
          </ul>
        )}
      </div>

      {editing?.kind === 'new' ? (
        <ScheduleFormDialog projects={projects} repos={repos} onClose={closeDialog} onSaved={invalidateData} />
      ) : null}
      {editing?.kind === 'edit' && editWorkflow ? (
        <ScheduleFormDialog
          projects={projects}
          repos={repos}
          workflow={editWorkflow}
          onClose={closeDialog}
          onSaved={invalidateData}
        />
      ) : null}
    </div>
  );
}

function ScheduleRow({
  schedule: s,
  busy,
  onEdit,
  onToggle,
  onRun,
}: {
  schedule: WorkflowSummary;
  busy: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRun: () => void;
}) {
  const cron = s.cron ?? '';
  const tz = s.timezone ?? 'UTC';
  const next = nextRuns(cron, tz, 1)[0];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{s.name}</span>
          {!s.enabled ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Paused
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {describeCron(cron)}
          {next ? <span className="text-muted-foreground/70"> · next {formatRun(next, tz)}</span> : null}
        </p>
        <p className="text-[11px] text-muted-foreground/70">
          {s.lastRunAt ? (
            <>
              Last fired {formatRun(new Date(s.lastRunAt), tz)}
              {s.lastRunStatus ? ` · ${s.lastRunStatus}` : ''}
            </>
          ) : (
            'Never fired yet'
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <label className="flex cursor-pointer items-center gap-1.5 pr-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={s.enabled}
            onChange={onToggle}
            disabled={busy}
            aria-label={s.enabled ? `Disable ${s.name}` : `Enable ${s.name}`}
          />
          Enabled
        </label>
        <Button type="button" variant="outline" size="sm" onClick={onRun} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run now
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Edit ${s.name}`} onClick={onEdit} disabled={busy}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Link
          href={`/workflows/edit?id=${s.id}`}
          aria-label={`Open ${s.name} in the workflow builder`}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
            busy && 'pointer-events-none opacity-50',
          )}
        >
          <PencilRuler className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}
