'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Check, ExternalLink, GitCompare, Plus, RefreshCw, X } from 'lucide-react';
import { ChecksPanel } from '@/components/checks-panel';
import { TaskMilestonePicker } from '@/components/task-milestone-picker';
import { TaskFailureHistory } from '@/components/task-failure-history';
import { RunTimeline } from '@/components/run-timeline';
import { ReplyBox } from '@/components/reply-box';
import { RetroTab } from '@/components/retro-tab';
import { PrDiffModal } from '@/components/pr-review/pr-diff-modal';
import { PrReviewPanel } from '@/components/pr-review/pr-review-panel';
import {
  ANSWER_EVENT_KIND,
  SOURCE_KIND_LABEL,
  isAnsweredQuestion,
  isTerminal,
  parseGithubPr,
  parseGithubRepo,
  type Project,
  type Status,
  type Task,
  type TaskSummary,
  type TaskEvent,
  type TaskLink,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { PrStatusChip } from '@/components/pr-status-chip';
import { ProjectSelect } from '@/components/project-select';
import { SourceIcon } from '@/components/source-icon';
import { TaskPicker } from '@/components/task-picker';
import { TaskActionButtons, useTaskActions } from '@/components/task-actions';
import { useConfirm } from '@/components/confirm-dialog';
import {
  addTaskDependency,
  addTaskLink,
  gatewayUrl,
  refreshPrStatus,
  removeTaskDependency,
  removeTaskLink,
  setTaskTags,
  updateTaskProject,
} from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { dependentsOf } from '@/lib/task-dependencies';
import { useTaskPaletteCommands } from '@/hooks/use-task-palette-commands';

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
  bug: 'Bugfix',
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
  /** The full board list — resolves blockers/dependents and feeds the add-blocker picker (Phase 27). */
  tasks: TaskSummary[];
  /**
   * Leave the detail surface. The modal closes itself; the full page navigates
   * back to `/tasks`. Also fired after a start/abandon/delete completes.
   */
  onClose: () => void;
  /**
   * `modal` (default) keeps the modal's scroll chrome (`flex-1 overflow-y-auto`)
   * and renders a Close button; `page` flows naturally and drops both, since the
   * full page scrolls itself and provides its own back affordance.
   */
  variant?: 'modal' | 'page';
  /**
   * Which detail section is active (Phase 52 E). On the full page a Details|Review
   * tab strip appears for a task with a `prUrl`; `review` mounts the diff viewer
   * inline. In the unified modal (Phase 70) the strip also carries a `session` tab
   * (see {@link sessionSlot}). Defaults to `details`.
   */
  tab?: TaskDetailTab;
  /** Called when the user switches tabs — the page syncs it to `?tab=`. */
  onTabChange?: (tab: TaskDetailTab) => void;
  /**
   * The Session tab's body (Phase 70). When provided (the unified modal supplies
   * a live terminal / transcript pane), a `Session` tab joins the strip and the
   * header's redundant Session nav button is dropped. Absent on the full page,
   * where the session lives at its own route (the nav button stays there).
   */
  sessionSlot?: ReactNode;
  /**
   * Suppress the modal's "Open page" affordance (Phase 70). Set from contexts
   * that must not navigate away — e.g. the office overlay, which stays on
   * `/office`.
   */
  disableNavigation?: boolean;
};

export type TaskDetailTab = 'details' | 'review' | 'retro' | 'session';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/**
 * The shared task-detail surface — header (status + transition controls) plus the
 * scrollable body. Consumed by `WorkItemModal` (overlay chrome + Session tab) and
 * the `/tasks/:id` full page (Phase 42). Extracted from the modal body; behaviour-preserving.
 */
export function TaskDetail({
  task,
  projects,
  tasks,
  onClose,
  variant = 'modal',
  tab,
  onTabChange,
  sessionSlot,
  disableNavigation = false,
}: Props) {
  // Phase 52 E: a Details|Review tab strip for a task with a PR. Phase 62 F: a
  // Retro tab joins once the task is terminal (a retro skeleton is always built
  // on the terminal transition). Phase 70: in the unified modal a Session tab
  // hosts the live terminal / transcript, so the strip always shows there.
  const inModal = variant === 'modal';
  const showSessionTab = inModal && !!sessionSlot;
  const showReviewTab = !!task.prUrl;
  const showRetroTab = isTerminal(task.status);
  const showTabs = inModal ? showSessionTab : showReviewTab || showRetroTab;
  const activeTab: TaskDetailTab =
    showTabs && tab === 'session' && showSessionTab
      ? 'session'
      : showTabs && tab === 'review' && showReviewTab
        ? 'review'
        : showTabs && tab === 'retro' && showRetroTab
          ? 'retro'
          : 'details';
  const selectTab = (next: TaskDetailTab) => onTabChange?.(next);

  const kind = task.kind ?? 'unknown';
  const statusHue = STATUS_HUE_VAR[task.status];
  const images = task.attachments?.filter((a) => a.mime.startsWith('image/')) ?? [];

  // Contextual ⌘K "Move to…" commands, live only while this detail surface is
  // mounted (modal or full page) — Phase 42 C.
  useTaskPaletteCommands(task, tasks);

  const router = useRouter();
  const confirm = useConfirm();
  const [links, setLinks] = useState<TaskLink[]>(task.links ?? []);
  const [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(task.projectId ?? null);
  const [projectBusy, setProjectBusy] = useState(false);
  const [tags, setTags] = useState<string[]>(task.tags);
  const [tagInput, setTagInput] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>(task.dependsOn ?? []);
  const [depError, setDepError] = useState<string | null>(null);
  const [prStatus, setPrStatus] = useState(task.prStatus);
  const [prRefreshing, setPrRefreshing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const refreshPr = async () => {
    setPrRefreshing(true);
    try {
      const updated = await refreshPrStatus(task.id);
      setPrStatus(updated.prStatus);
      invalidateData();
    } catch {
      // fail-open — keep showing last-known status
    } finally {
      setPrRefreshing(false);
    }
  };
  const [depBusy, setDepBusy] = useState(false);

  const tasksById = new Map(tasks.map((t) => [t.id, t] as const));

  // Lifecycle mutations (start / abandon / reopen / delete) + their shared busy /
  // error state, shared with the session cockpit. Completing any of them leaves
  // this surface (the modal closes; the full page routes back to /tasks).
  const actions = useTaskActions({ task, tasksById, onActionComplete: onClose });
  const { statusError, setStatusError } = actions;

  // Open tasks that aren't this task and aren't already a blocker — candidates to add.
  const blockerCandidates = tasks.filter(
    (t) => t.id !== task.id && !dependsOn.includes(t.id) && t.status !== 'done' && t.status !== 'abandoned',
  );
  const dependents = dependentsOf(task.id, tasks);

  const addBlocker = async (blockerId: string) => {
    setDepBusy(true);
    setDepError(null);
    try {
      const updated = await addTaskDependency(task.id, blockerId);
      setDependsOn(updated.dependsOn ?? []);
      invalidateData();
    } catch (e) {
      // Surfaces the gateway's self-reference / cycle / unknown-task message.
      setDepError(e instanceof Error ? e.message : 'Failed to add dependency');
    } finally {
      setDepBusy(false);
    }
  };

  const removeBlocker = async (blockerId: string) => {
    setDepBusy(true);
    setDepError(null);
    try {
      const updated = await removeTaskDependency(task.id, blockerId);
      setDependsOn(updated.dependsOn ?? []);
      invalidateData();
    } catch (e) {
      setDepError(e instanceof Error ? e.message : 'Failed to remove dependency');
    } finally {
      setDepBusy(false);
    }
  };

  const saveTags = async (next: string[]) => {
    const prev = tags;
    setTags(next); // optimistic
    try {
      const updated = await setTaskTags(task.id, next);
      setTags(updated.tags); // reflect server-side normalisation
      invalidateData();
    } catch {
      setTags(prev); // roll back
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput('');
      return;
    }
    setTagInput('');
    void saveTags([...tags, tag]);
  };

  const removeTag = (tag: string) => void saveTags(tags.filter((t) => t !== tag));

  const reassign = async (next: string | null) => {
    const prev = projectId;
    setProjectId(next); // optimistic
    setProjectBusy(true);
    setStatusError(null);
    try {
      await updateTaskProject(task.id, next);
      invalidateData();
    } catch (e) {
      setProjectId(prev); // roll back
      setStatusError(e instanceof Error ? e.message : 'Failed to change project');
    } finally {
      setProjectBusy(false);
    }
  };

  // session.id === task.id; deep-link straight into the session cockpit (Phase 51 F).
  const goToSession = () => {
    onClose();
    router.push(`/sessions/view?id=${encodeURIComponent(task.id)}`);
  };

  // "Open page" (tab-strip level, Phase 70): expand the modal into the full page
  // for whatever's active — the session cockpit on the Session tab, otherwise the
  // task page (carrying the review/retro sub-tab).
  const openPage = () => {
    onClose();
    if (activeTab === 'session') {
      router.push(`/sessions/view?id=${encodeURIComponent(task.id)}`);
      return;
    }
    const suffix = activeTab === 'review' || activeTab === 'retro' ? `&tab=${activeTab}` : '';
    router.push(`/tasks/view?id=${encodeURIComponent(task.id)}${suffix}`);
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
      invalidateData();
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
      invalidateData();
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Failed to remove link');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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
            {isAnsweredQuestion(task) ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
                <Check aria-hidden className="h-3 w-3" />
                Answered
              </span>
            ) : null}
            {task.repo ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate font-mono">{task.repo}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Full page: the task's controls live in the header cluster. In the
              unified modal they move down to the tab strip so they share the row
              with "Open page" (Phase 74); only the Close button stays up here. */}
          {!inModal ? (
            <>
              {projects.length > 0 ? (
                <ProjectSelect
                  projects={projects}
                  value={projectId}
                  onChange={(next) => void reassign(next)}
                  disabled={projectBusy}
                  align="right"
                />
              ) : null}
              <TaskActionButtons
                task={task}
                actions={actions}
                showSession={!showSessionTab}
                onOpenSession={goToSession}
              />
            </>
          ) : null}
          {variant === 'modal' ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      {showTabs ? (
        <div className="flex items-center gap-1 border-b border-border/60 px-5" role="tablist" aria-label="Task detail sections">
          <TabButton active={activeTab === 'details'} onClick={() => selectTab('details')}>
            Details
          </TabButton>
          {showSessionTab && (
            <TabButton active={activeTab === 'session'} onClick={() => selectTab('session')}>
              Session
            </TabButton>
          )}
          {showReviewTab && (
            <TabButton active={activeTab === 'review'} onClick={() => selectTab('review')}>
              Review
            </TabButton>
          )}
          {showRetroTab && (
            <TabButton active={activeTab === 'retro'} onClick={() => selectTab('retro')}>
              Retro
            </TabButton>
          )}
          {inModal ? (
            // The modal's task controls share this row with "Open page" (Phase 74):
            // the project picker, the lifecycle actions (icon-only, label on hover),
            // then the far-right expand-to-page affordance.
            <div className="ml-auto flex items-center gap-1.5 py-1.5">
              {projects.length > 0 ? (
                <ProjectSelect
                  projects={projects}
                  value={projectId}
                  onChange={(next) => void reassign(next)}
                  disabled={projectBusy}
                  align="right"
                />
              ) : null}
              <TaskActionButtons task={task} actions={actions} />
              {!disableNavigation ? (
                <Button type="button" variant="secondary" size="sm" onClick={openPage}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Open page
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === 'session' && showSessionTab ? (
        <div className="flex min-h-0 flex-1 flex-col">{sessionSlot}</div>
      ) : activeTab === 'review' && task.prUrl ? (
        <div className="flex min-h-[60vh] flex-col">
          <PrReviewPanel taskId={task.id} prUrl={task.prUrl} />
        </div>
      ) : activeTab === 'retro' ? (
        <div className={variant === 'modal' ? 'flex-1 overflow-y-auto px-5 py-4' : 'px-5 py-4'}>
          <RetroTab task={task} />
        </div>
      ) : (
      <div
        className={
          variant === 'modal'
            ? 'flex-1 space-y-5 overflow-y-auto px-5 py-4'
            : 'space-y-5 px-5 py-4'
        }
      >
        {statusError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {statusError}
          </div>
        ) : null}
        {/* Phase 69 D — answer a live wait (`needs-input`, session bound) inline,
            without opening the terminal. Dead/needs-attention waits keep their
            resolve actions (failure history below) instead. */}
        {task.status === 'waiting' && task.waitReason === 'needs-input' && task.sessionId ? (
          <section className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              Agent is waiting on you
            </h3>
            <ReplyBox sessionId={task.sessionId} />
          </section>
        ) : null}
        <section>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Tags
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              onBlur={addTag}
              placeholder="Add tag…"
              className="min-w-[5rem] flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              aria-label="Add a tag"
            />
          </div>
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Milestone
          </h3>
          <TaskMilestonePicker taskId={task.id} projectId={projectId} currentMilestoneId={task.milestoneId} />
        </section>
        <section>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dependencies
          </h3>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Blocked by
          </p>
          {dependsOn.length > 0 ? (
            <ul className="mb-2 space-y-1.5">
              {dependsOn.map((id) => {
                const blocker = tasksById.get(id);
                const done = blocker?.status === 'done';
                const blockerStatus = blocker?.status;
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background: blockerStatus
                          ? `hsl(var(${STATUS_HUE_VAR[blockerStatus]}))`
                          : 'hsl(var(--muted-foreground))',
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {blocker ? blocker.title : '(unknown)'}
                    </span>
                    <span
                      className={`shrink-0 text-[10px] font-medium uppercase tracking-wider ${
                        done ? 'text-success' : 'text-muted-foreground'
                      }`}
                    >
                      {done ? 'done' : 'pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => void removeBlocker(id)}
                      disabled={depBusy}
                      aria-label={`Remove blocker ${blocker ? blocker.title : id}`}
                      className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-muted-foreground">No blockers.</p>
          )}
          <TaskPicker
            candidates={blockerCandidates}
            onPick={(t) => void addBlocker(t.id)}
            disabled={depBusy}
            label="Search tasks to block on"
            placeholder="Add a blocking task…"
          />
          {depError ? <p className="mt-1.5 text-xs text-destructive">{depError}</p> : null}
          {dependents.length > 0 ? (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Blocks
              </p>
              <ul className="space-y-1.5">
                {dependents.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: `hsl(var(${STATUS_HUE_VAR[d.status]}))` }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{d.title}</span>
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {STATUS_LABEL[d.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
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

        {task.prUrl ? (
          <section>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Pull request
              </h3>
              <button
                type="button"
                onClick={() => void refreshPr()}
                disabled={prRefreshing}
                aria-label="Refresh PR status"
                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${prRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
              {prStatus ? (
                <PrStatusChip status={prStatus} />
              ) : (
                <span className="text-xs text-muted-foreground">Status unknown</span>
              )}
              {prStatus?.reviewDecision ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                  {prStatus.reviewDecision.replace(/_/g, ' ')}
                </span>
              ) : null}
              {showTabs && showReviewTab ? (
                // Whenever a Review tab is in the strip (full page, or the unified
                // modal), the diff lives there — deep-link to it (Phase 70).
                <button
                  type="button"
                  onClick={() => selectTab('review')}
                  className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <GitCompare className="h-3 w-3" /> Review
                </button>
              ) : (
                // In the board modal, open the full-screen diff, plus a deep-link
                // to the full Review page (the board entry point).
                <>
                  <button
                    type="button"
                    onClick={() => setShowDiff(true)}
                    className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <GitCompare className="h-3 w-3" /> View diff
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/tasks/view?id=${encodeURIComponent(task.id)}&tab=review`)
                    }
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Review page <ExternalLink className="h-3 w-3" />
                  </button>
                </>
              )}
              <a
                href={task.prUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Open PR <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {showDiff ? (
              <PrDiffModal taskId={task.id} prUrl={task.prUrl} onClose={() => setShowDiff(false)} />
            ) : null}
          </section>
        ) : null}

        {task.aiReview ? (
          <section>
            <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              AI Review
            </h3>
            <div className="rounded-lg border border-border/60 px-3 py-2 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                    task.aiReview.verdict === 'approved'
                      ? 'bg-success/15 text-success'
                      : task.aiReview.verdict === 'changes-requested'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                  ].join(' ')}
                >
                  {task.aiReview.verdict === 'approved'
                    ? 'LGTM'
                    : task.aiReview.verdict === 'changes-requested'
                    ? 'Changes requested'
                    : 'Reviewed'}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(task.aiReview.reviewedAt).toLocaleString()}
                </span>
              </div>
              {task.aiReview.summary ? (
                <p className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {task.aiReview.summary}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <section>
          <ChecksPanel taskId={task.id} />
        </section>

        {task.retryCount > 0 || task.waitReason ? (
          // Phase 53 E — structured failure history for a task that has failed.
          <TaskFailureHistory taskId={task.id} />
        ) : null}

        {/* Phase 61 G — per-task run strip (attempts / retries / live run). */}
        <section>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground marker:content-none">
              <span className="transition-transform group-open:rotate-90" aria-hidden>
                ›
              </span>
              Agent runs
            </summary>
            <div className="mt-2">
              <RunTimeline taskId={task.id} />
            </div>
          </details>
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activity
          </h3>
          <Timeline events={task.events} />
        </section>
      </div>
      )}
    </>
  );
}

// Friendly labels for the lifecycle event kinds (docs/LIFECYCLE.md). Anything not
// listed falls back to the raw kind. Phase 69 D adds `agent.resumed` — a waiting
// agent picked back up by a reply or an approval.
const EVENT_KIND_LABEL: Record<string, string> = {
  'agent.started': 'Agent started',
  'agent.waiting': 'Agent waiting on input',
  'agent.resumed': 'Resumed by reply / approval',
  'agent.escalated': 'Escalated — needs attention',
  'agent.requeued': 'Requeued',
  'agent.retried': 'Retried',
  'agent.done': 'Agent finished',
  'task.reopened': 'Reopened',
  'task.replanned': 'Re-planned',
};

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
            <p className="text-sm font-medium leading-snug">
              {ev.kind === ANSWER_EVENT_KIND ? 'Answer' : (EVENT_KIND_LABEL[ev.kind] ?? ev.kind)}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatTime(ev.at)}</p>
            {ev.kind === ANSWER_EVENT_KIND && typeof ev.data?.text === 'string' ? (
              // A question answered inline at intake — render the markdown answer
              // rather than dumping the event payload as JSON.
              <div className="mt-1 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                <MarkdownPreview content={ev.data.text} />
              </div>
            ) : ev.data && Object.keys(ev.data).length > 0 ? (
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
