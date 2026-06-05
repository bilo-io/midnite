'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LayoutGrid, List, ListTree } from 'lucide-react';
import {
  SESSION_STATUSES,
  type Project,
  type SessionStatus,
  type SessionSummary,
  type SessionTranscript,
  type Task,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { FilterPills, type FilterOption } from '@/components/filter-pills';
import { ProjectMultiSelect } from '@/components/project-multi-select';
import {
  SESSION_STATUS_HUE,
  SESSION_STATUS_LABEL,
  SessionCard,
  SessionRow,
} from '@/components/session-card';
import { SessionTranscriptModal } from '@/components/session-transcript-modal';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import type { ProjectTagInfo } from '@/components/task-card';
import { getSessionTranscript } from '@/lib/api';
import { cn } from '@/lib/utils';

type View = 'list' | 'grid' | 'table';
const VIEWS: readonly View[] = ['list', 'grid', 'table'];
const VIEW_STORAGE_KEY = 'midnite.sessions.view';

const SESSION_FILTERS: FilterOption[] = [
  { value: 'running', label: 'Running', hue: SESSION_STATUS_HUE.running },
  { value: 'waiting', label: 'Awaiting input', hue: SESSION_STATUS_HUE.waiting },
  { value: 'completed', label: 'Completed', hue: SESSION_STATUS_HUE.completed },
  { value: 'idle', label: 'Idle', hue: SESSION_STATUS_HUE.idle },
];

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function SessionsView({
  initial,
  tasks,
  projects,
}: {
  initial: SessionSummary[];
  tasks: Task[];
  projects: Project[];
}) {
  const [view, setView] = useState<View>('list');
  const [selected, setSelected] = useState<SessionSummary | null>(null);
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored && (VIEWS as readonly string[]).includes(stored)) setView(stored as View);
  }, []);

  const onSetView = useCallback((next: View) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const onSelect = useCallback(async (session: SessionSummary) => {
    setSelected(session);
    setTranscript(null);
    setLoadError(null);
    setLoading(true);
    try {
      const data = await getSessionTranscript(session.projectSlug, session.id);
      setTranscript(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  }, []);

  const onClose = useCallback(() => {
    setSelected(null);
    setTranscript(null);
    setLoadError(null);
  }, []);

  // A session's project is resolved through its linked task.
  const projectIdByTask = useMemo(() => new Map(tasks.map((t) => [t.id, t.projectId])), [tasks]);
  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, { tag: p.tag, color: p.color } as ProjectTagInfo])),
    [projects],
  );
  const projectIdOf = useCallback(
    (s: SessionSummary): string | undefined =>
      s.linkedTaskId ? projectIdByTask.get(s.linkedTaskId) : undefined,
    [projectIdByTask],
  );

  const searchParams = useSearchParams();
  const activeRaw = searchParams.get('status');
  const activeStatuses = new Set(
    (activeRaw ? activeRaw.split(',') : []).filter((s): s is SessionStatus =>
      (SESSION_STATUSES as readonly string[]).includes(s),
    ),
  );
  const validProjects = new Set(projects.map((p) => p.id));
  const rawProject = searchParams.get('project');
  const activeProjects = new Set(
    (rawProject ? rawProject.split(',') : []).filter((p) => validProjects.has(p)),
  );
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const searched = q
    ? initial.filter((s) =>
        [s.title, s.subtitle, s.projectDisplay].some((f) => f.toLowerCase().includes(q)),
      )
    : initial;

  // Project filter applies across every view; status filter narrows the rest.
  const projectFiltered =
    activeProjects.size === 0
      ? searched
      : searched.filter((s) => {
          const pid = projectIdOf(s);
          return pid !== undefined && activeProjects.has(pid);
        });
  const sessions =
    activeStatuses.size === 0
      ? projectFiltered
      : projectFiltered.filter((s) => activeStatuses.has(s.status));

  const projectFilters: FilterOption[] = projects.map((p) => ({
    value: p.id,
    label: p.tag,
    color: p.color,
  }));

  // Table sections: one accordion per visible status, session rows beneath.
  const visibleStatuses =
    activeStatuses.size === 0 ? SESSION_STATUSES : SESSION_STATUSES.filter((s) => activeStatuses.has(s));
  const sections: AccordionSection[] = visibleStatuses.map((status) => {
    const items = projectFiltered.filter((s) => s.status === status);
    const projectCount = new Set(
      items.map((s) => projectIdOf(s)).filter((id): id is string => Boolean(id)),
    ).size;
    return {
      id: status,
      label: SESSION_STATUS_LABEL[status],
      hue: SESSION_STATUS_HUE[status],
      count: items.length,
      summary:
        items.length === 0
          ? 'Empty'
          : `${plural(items.length, 'session')} · ${plural(projectCount, 'project')}`,
      body:
        items.length === 0 ? (
          <div className="px-4 py-3 text-xs text-muted-foreground/70">Nothing here</div>
        ) : (
          items.map((s) => (
            <SessionRow
              key={`${s.projectSlug}/${s.id}`}
              session={s}
              project={projectIdOf(s) ? projectsById.get(projectIdOf(s)!) : undefined}
              onClick={() => onSelect(s)}
            />
          ))
        ),
    };
  });

  return (
    <div className="space-y-4">
      {initial.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {projects.length > 0 ? <ProjectMultiSelect options={projectFilters} /> : null}
          <FilterPills options={SESSION_FILTERS} />
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground tabular-nums">{plural(sessions.length, 'session')}</p>
        <div className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="List view"
            aria-pressed={view === 'list'}
            onClick={() => onSetView('list')}
            className={cn('h-7 w-7', view === 'list' && 'bg-accent text-accent-foreground')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => onSetView('grid')}
            className={cn('h-7 w-7', view === 'grid' && 'bg-accent text-accent-foreground')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Table view"
            aria-pressed={view === 'table'}
            onClick={() => onSetView('table')}
            className={cn('h-7 w-7', view === 'table' && 'bg-accent text-accent-foreground')}
          >
            <ListTree className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No tasks yet — create a task and its session shows up here.
        </div>
      ) : view === 'table' ? (
        <SortableAccordions sections={sections} storageKey="midnite.sessions.sections" />
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No sessions match this filter.
        </div>
      ) : view === 'list' ? (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <SessionCard
              key={`${s.projectSlug}/${s.id}`}
              session={s}
              layout="list"
              onClick={() => onSelect(s)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard
              key={`${s.projectSlug}/${s.id}`}
              session={s}
              layout="grid"
              onClick={() => onSelect(s)}
            />
          ))}
        </div>
      )}

      {selected ? (
        <SessionTranscriptModal
          session={selected}
          transcript={transcript}
          loading={loading}
          error={loadError}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
}
