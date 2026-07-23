import { AlertTriangle, Check, Milestone, PauseCircle, ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isNeedsAttention, type TaskSummary } from '@midnite/shared';
import { BlockedBadge } from '@/components/blocked-badge';
import { WaitingQuickReply } from '@/components/waiting-quick-reply';
import { PrStatusChip } from '@/components/pr-status-chip';
import { ProjectTag } from '@/components/project-tag';
import { RepoChip } from '@/components/repo-chip';
import { SourceIcon } from '@/components/source-icon';
import { gatewayUrl } from '@/lib/api';
import { useHeldReasonLabel, useKindLabel, useWaitReasonLabel } from '@/lib/i18n-labels';
import { cn } from '@/lib/utils';

export type ProjectTagInfo = { tag: string; color: string };

const KIND_HUE_VARS: Record<NonNullable<TaskSummary['kind']>, string> = {
  bug: '--kind-bug',
  feature: '--kind-feature',
  question: '--kind-question',
  chore: '--kind-chore',
  unknown: '--kind-unknown',
};

const AI_REVIEW_CHIP_CLASS: Record<'approved' | 'commented' | 'changes-requested', string> = {
  approved: 'bg-success/15 text-success',
  commented: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  'changes-requested': 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

function AiReviewChip({ verdict }: { verdict: 'approved' | 'commented' | 'changes-requested' }) {
  const t = useTranslations('board');
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${AI_REVIEW_CHIP_CLASS[verdict]}`}
    >
      {t(`aiReview.${verdict}`)}
    </span>
  );
}

// Badge shown only for non-Normal priorities (Normal=1 is the unmarked default).
const PRIORITY_BADGES: Record<number, { labelKey: 'low' | 'high' | 'urgent'; className: string }> = {
  0: { labelKey: 'low', className: 'bg-muted text-muted-foreground' },
  2: { labelKey: 'high', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  3: { labelKey: 'urgent', className: 'bg-destructive/15 text-destructive' },
};

export function TaskCard({
  task,
  project,
  onSelect,
  blockedBy,
}: {
  task: TaskSummary;
  project?: ProjectTagInfo;
  onSelect?: () => void;
  /** Count of unmet blockers (Phase 27); when > 0 shows a chip and dims the card. */
  blockedBy?: number;
}) {
  const t = useTranslations('board');
  const kindLabel = useKindLabel();
  const waitReasonLabel = useWaitReasonLabel();
  const heldReasonLabel = useHeldReasonLabel();
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
          {kindLabel(kind)}
        </span>
        {task.answered ? (
          // A question resolved inline at intake (Phase 15 Theme C) — distinguish
          // it from ordinary completed work sitting in the Done column.
          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-success">
            <Check aria-hidden className="h-3 w-3" />
            {t('card.answered')}
          </span>
        ) : null}
        {priorityBadge ? (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${priorityBadge.className}`}
          >
            {t(`priority.${priorityBadge.labelKey}`)}
          </span>
        ) : null}
        {project ? <ProjectTag tag={project.tag} color={project.color} /> : null}
        {task.repo ? <RepoChip repo={task.repo} /> : null}
        {isBlocked ? <BlockedBadge count={blockedBy ?? 0} /> : null}
        {task.heldReason ? (
          // Phase 50 B — the scheduler is holding this ready task because a hard
          // budget/rate cap is blocking spawns (derived, not a status change).
          <span
            title={t('card.heldTitle')}
            className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400"
          >
            <PauseCircle aria-hidden className="h-3 w-3" />
            {t('card.held', { reason: heldReasonLabel(task.heldReason) })}
          </span>
        ) : null}
        {isNeedsAttention(task.waitReason) ? (
          // Phase 53 E — a failure escalated this task to a needs-attention
          // `waiting` state (retries exhausted / non-retryable / gate-failed).
          <span
            title={t('card.needsAttentionTitle')}
            className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive"
          >
            <AlertTriangle aria-hidden className="h-3 w-3" />
            {waitReasonLabel(task.waitReason!)}
            {task.retryCount > 0 ? ` · ${task.retryCount}×` : ''}
          </span>
        ) : null}
        {task.checkRunStatus === 'failing' ? (
          <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
            <ShieldAlert aria-hidden className="h-3 w-3" />
            {t('card.checksFailing')}
          </span>
        ) : null}
        {task.prStatus ? <PrStatusChip status={task.prStatus} /> : null}
        {task.aiReview ? <AiReviewChip verdict={task.aiReview.verdict} /> : null}
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {task.milestoneName ? (
        // Phase 58 F — the assigned milestone (name joined onto TaskSummary).
        <div className="mt-1.5">
          <span className="inline-flex max-w-full items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            <Milestone className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{task.milestoneName}</span>
          </span>
        </div>
      ) : null}
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
    'group block w-full rounded-md border task-surface p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow',
    isBlocked && 'opacity-60',
    // Executing (an agent is actively running it) — the signature rotating,
    // pulsating gradient frame, shared across every task view.
    task.status === 'wip' && 'task-running',
    // Waiting (parked for input/approval) — a gentler, orange-toned cousin.
    task.status === 'waiting' && 'task-waiting',
  );

  // Phase 69 D — a *live* wait (`needs-input`) can be answered from the board
  // without opening the terminal. `needs-input` implies a bound live session
  // (escalate() clears the session + uses a needs-attention reason), so it's a
  // safe proxy for "reply-able" on the lean board DTO. Dead/needs-attention waits
  // keep their resolve actions (rendered elsewhere) — no reply box that goes nowhere.
  const liveWait = task.status === 'waiting' && task.waitReason === 'needs-input';

  const card = onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      className={className}
      style={{ ['--kind-hue' as string]: `var(${hue})` }}
    >
      {body}
    </button>
  ) : (
    <div className={className} style={{ ['--kind-hue' as string]: `var(${hue})` }}>
      {body}
    </div>
  );

  if (!liveWait) return card;

  // The quick-reply sits *outside* the card button (interactives can't nest) as a
  // compact action row beneath it.
  return (
    <div className="space-y-1">
      {card}
      <div className="px-0.5">
        <WaitingQuickReply sessionId={task.id} />
      </div>
    </div>
  );
}
