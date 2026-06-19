'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BotMessageSquare, LayoutGrid, List, ListTree } from 'lucide-react';
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
import { CollapsibleStatusGroups } from '@/components/collapsible-status-groups';
import { SessionTranscriptModal } from '@/components/session-transcript-modal';
import { SessionTerminalModal } from '@/components/session-terminal-modal';
import { SortableAccordions, type AccordionSection } from '@/components/sortable-accordions';
import type { ProjectTagInfo } from '@/components/task-card';
import { archiveSession, deleteSession, getSessionTranscript, unarchiveSession } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { BulkActionBar, BULK_COLORS, type BulkAction } from '@/components/bulk-action-bar';
import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { NewSessionButton } from '@/components/new-session-button';
import { useBulkSelection } from '@/lib/use-bulk-selection';
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

// Active sessions have a live PTY behind them; completed/idle fall back to the
// static transcript.
function isActive(status: SessionStatus): boolean {
  return status === 'running' || status === 'waiting';
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
    // Active sessions get a live terminal (no static transcript to fetch).
    if (isActive(session.status)) return;
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

  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();

  const onArchiveToggle = useCallback(
    async (session: SessionSummary) => {
      if (!session.archivedAt) {
        const ok = await confirm({
          title: 'Archive this session?',
          description: 'It moves out of the active board. You can unarchive it again later.',
          confirmLabel: 'Archive',
          destructive: false,
        });
        if (!ok) return;
      }
      try {
        if (session.archivedAt) await unarchiveSession(session.id);
        else await archiveSession(session.id);
      } finally {
        onClose();
        invalidateData();
      }
    },
    [confirm, onClose],
  );

  // Permanent delete — only offered once a session is archived.
  const onDelete = useCallback(
    async (session: SessionSummary) => {
      try {
        await deleteSession(session.id);
      } finally {
        onClose();
        invalidateData();
      }
    },
    [onClose],
  );

  // --- Bulk selection ---
  const {
    selectedIds,
    count: selectedCount,
    clear: clearSelection,
    isSelected,
    toggle: toggleSelect,
  } = useBulkSelection();

  const selectedSessions = useMemo(
    () => initial.filter((s) => selectedIds.includes(s.id)),
    [initial, selectedIds],
  );

  const runBulk = useCallback(
    async (ids: string[], op: (id: string) => Promise<unknown>) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => op(id)));
      clearSelection();
      invalidateData();
    },
    [clearSelection],
  );

  const deleteSelection = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const ok = await confirm({
        title: `Delete ${ids.length} session${ids.length === 1 ? '' : 's'}?`,
        description: 'This permanently removes the transcript. This cannot be undone.',
        confirmLabel: 'Delete',
      });
      if (!ok) return;
      await runBulk(ids, (id) => deleteSession(id));
    },
    [confirm, runBulk],
  );

  // Archive endpoints are session-specific; delete is only valid once archived,
  // so the Delete chip only appears for already-archived selections.
  const bulkActions = useMemo<BulkAction[]>(() => {
    const actions: BulkAction[] = [];
    const toArchive = selectedSessions.filter((s) => !s.archivedAt).map((s) => s.id);
    const archived = selectedSessions.filter((s) => s.archivedAt).map((s) => s.id);
    if (toArchive.length) {
      actions.push({
        key: 'archive',
        label: 'Archive',
        color: BULK_COLORS.archive,
        onClick: () => void runBulk(toArchive, (id) => archiveSession(id)),
      });
    }
    if (archived.length) {
      actions.push({
        key: 'unarchive',
        label: 'Unarchive',
        color: BULK_COLORS.archive,
        onClick: () => void runBulk(archived, (id) => unarchiveSession(id)),
      });
      actions.push({
        key: 'delete',
        label: 'Delete',
        color: BULK_COLORS.delete,
        onClick: () => void deleteSelection(archived),
      });
    }
    return actions;
  }, [selectedSessions, runBulk, deleteSelection]);

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

  // Deep-link target from the task modal's "Open session": auto-open it once.
  const openId = searchParams.get('open');
  const handledOpenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || handledOpenRef.current === openId) return;
    const match = initial.find((s) => s.id === openId);
    if (!match) return;
    handledOpenRef.current = openId;
    void onSelect(match);
    // Strip the param so a manual close + refresh doesn't reopen it.
    const params = new URLSearchParams(searchParams.toString());
    params.delete('open');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [openId, initial, onSelect, router, pathname, searchParams]);

  const showArchived = searchParams.get('archived') === '1';
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
  // Archive is an orthogonal bucket: hide archived by default; the Archived toggle shows only archived.
  const archiveScoped = initial.filter((s) => (showArchived ? Boolean(s.archivedAt) : !s.archivedAt));
  const searched = q
    ? archiveScoped.filter((s) =>
        [s.title, s.subtitle, s.projectDisplay].some((f) => f.toLowerCase().includes(q)),
      )
    : archiveScoped;

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
              selected={isSelected(s.id)}
              onToggleSelect={(sk) => toggleSelect(s.id, sk, sessions.map((x) => x.id))}
            />
          ))
        ),
    };
  });

  // List & grid both group sessions by status, mirroring the table's sections.
  // Empty groups are dropped here (the table keeps them as collapsible rows).
  const statusGroups = visibleStatuses
    .map((status) => ({ status, items: sessions.filter((s) => s.status === status) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="reveal-controls flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="shrink-0 text-xs tabular-nums text-muted-foreground">{plural(sessions.length, 'session')}</p>
          {projects.length > 0 ? <ProjectMultiSelect options={projectFilters} /> : null}
          <FilterPills options={SESSION_FILTERS} />
          <FilterPills
            options={[{ value: '1', label: 'Archived', hue: '215 14% 47%' }]}
            paramKey="archived"
            allLabel="Active"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
          <NewSessionButton />
        </div>
      </div>

      <BulkActionBar count={selectedCount} actions={bulkActions} onClear={clearSelection} />

      <div className="reveal-content">
        {initial.length === 0 ? (
          <EmptyState
            Icon={BotMessageSquare}
            title="No sessions yet"
            description="Create a task and its agent session shows up here."
          />
        ) : view === 'table' ? (
          <SortableAccordions sections={sections} storageKey="midnite.sessions.sections" />
        ) : sessions.length === 0 ? (
          <EmptyState Icon={BotMessageSquare} title="No sessions match this filter" />
        ) : (
          <CollapsibleStatusGroups
            storageKey={`midnite.sessions.${view}Groups`}
            groups={statusGroups.map((g) => ({
              id: g.status,
              label: SESSION_STATUS_LABEL[g.status],
              hue: SESSION_STATUS_HUE[g.status],
              count: g.items.length,
              body:
                view === 'list' ? (
                  <div className="flex flex-col gap-2">
                    {g.items.map((s) => (
                      <SessionCard
                        key={`${s.projectSlug}/${s.id}`}
                        session={s}
                        layout="list"
                        onClick={() => onSelect(s)}
                        selected={isSelected(s.id)}
                        onToggleSelect={(sk) => toggleSelect(s.id, sk, sessions.map((x) => x.id))}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {g.items.map((s) => (
                      <SessionCard
                        key={`${s.projectSlug}/${s.id}`}
                        session={s}
                        layout="grid"
                        onClick={() => onSelect(s)}
                        selected={isSelected(s.id)}
                        onToggleSelect={(sk) => toggleSelect(s.id, sk, sessions.map((x) => x.id))}
                      />
                    ))}
                  </div>
                ),
            }))}
          />
        )}
      </div>

      {selected ? (
        isActive(selected.status) ? (
          <SessionTerminalModal
            session={selected}
            onClose={onClose}
            onArchiveToggle={() => void onArchiveToggle(selected)}
            onDelete={() => void onDelete(selected)}
          />
        ) : (
          <SessionTranscriptModal
            session={selected}
            transcript={transcript}
            loading={loading}
            error={loadError}
            onClose={onClose}
            onArchiveToggle={() => void onArchiveToggle(selected)}
            onDelete={() => void onDelete(selected)}
          />
        )
      ) : null}
    </div>
  );
}
