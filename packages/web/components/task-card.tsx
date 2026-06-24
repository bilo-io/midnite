import { Check, ShieldAlert } from 'lucide-react';
import { isAnsweredQuestion, type Task } from '@midnite/shared';
import { BlockedBadge } from '@/components/blocked-badge';
import { PrStatusChip } from '@/components/pr-status-chip';
import { ProjectTag } from '@/components/project-tag';
import { RepoChip } from '@/components/repo-chip';
import { SourceIcon } from '@/components/source-icon';
import { gatewayUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

export type ProjectTagInfo = { tag: string; color: string };

const KIND_LABELS: Record<NonNullable<Task['kind']>, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};

const KIND_HUE_VARS: Record<NonNullable<Task['kind']>, string> = {
  bug: '--kind-bug',
  feature: '--kind-feature',
  question: '--kind-question',
  chore: '--kind-chore',
  unknown: '--kind-unknown',
};

const AI_REVIEW_CHIP: Record<
  'approved' | 'commented' | 'changes-requested',
  { label: string; className: string }
> = {
  approved: { label: 'AI: LGTM', className: 'bg-success/15 text-success' },
  commented: { label: 'AI: Reviewed', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  'changes-requested': { label: 'AI: Changes', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
};

function AiReviewChip({ verdict }: { verdict: 'approved' | 'commented' | 'changes-requested' }) {
  const { label, className } = AI_REVIEW_CHIP[verdict];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}

// Badge shown only for non-Normal priorities (Normal=1 is the unmarked default).
const PRIORITY_BADGES: Record<number, { label: string; className: string }> = {
  0: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  2: { label: 'High', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  3: { label: 'Urgent', className: 'bg-destructive/15 text-destructive' },
};

export function TaskCard({
  task,
  project,
  onSelect,
  blockedBy,
}: {
  task: Task;
  project?: ProjectTagInfo;
  onSelect?: () => void;
  /** Count of unmet blockers (Phase 27); when > 0 shows a chip and dims the card. */
  blockedBy?: number;
}) {
  const kind = task.kind ?? 'unknown';
  const firstImage = task.attachments?.find((a) => a.mime.startsWith('image/'));
  const hue = KIND_HUE_VARS[kind];
  const priorityBadge = PRIORITY_BADGES[task.priority ?? 1];
  const isBlocked = (blockedBy ?? 0) > 0;

  const body = (
    <>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            background: 'hsl(var(--kind-hue) / 0.12)',
            color: 'hsl(var(--kind-hue))',
          }}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: 'hsl(var(--kind-hue))' }}
          />
          {KIND_LABELS[kind]}
        </span>
        {isAnsweredQuestion(task) ? (
          // A question resolved inline at intake (Phase 15 Theme C) — distinguish
          // it from ordinary completed work sitting in the Done column.
          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
            <Check aria-hidden className="h-3 w-3" />
            Answered
          </span>
        ) : null}
        {priorityBadge ? (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${priorityBadge.className}`}
          >
            {priorityBadge.label}
          </span>
        ) : null}
        {project ? <ProjectTag tag={project.tag} color={project.color} /> : null}
        {task.repo ? <RepoChip repo={task.repo} /> : null}
        {isBlocked ? <BlockedBadge count={blockedBy ?? 0} /> : null}
        {task.checkRunStatus === 'failing' ? (
          <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
            <ShieldAlert aria-hidden className="h-3 w-3" />
            Checks failing
          </span>
        ) : null}
        {task.prStatus ? <PrStatusChip status={task.prStatus} /> : null}
        {task.aiReview ? <AiReviewChip verdict={task.aiReview.verdict} /> : null}
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.tags.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.tags.map((t) => (
            <span
              key={t}
              className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {task.links && task.links.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-foreground/70">
          {task.links.slice(0, 6).map((l) => (
            <SourceIcon key={l.id} kind={l.kind} className="h-3.5 w-3.5" />
          ))}
        </div>
      ) : null}
      {firstImage && (
        <img
          src={`${gatewayUrl()}/uploads/${firstImage.path}`}
          alt=""
          className="mt-2 max-h-24 w-full rounded border object-cover"
        />
      )}
    </>
  );

  const className = cn(
    'group block w-full rounded-md border bg-background p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow',
    isBlocked && 'opacity-60',
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={className}
        style={{ ['--kind-hue' as string]: `var(${hue})` }}
      >
        {body}
      </button>
    );
  }

  return (
    <div className={className} style={{ ['--kind-hue' as string]: `var(${hue})` }}>
      {body}
    </div>
  );
}
