'use client';

import { CheckCircle2, Circle, GitMerge, GitPullRequest, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { PrCheckState, PrStatus } from '@midnite/shared';
import { cn } from '@/lib/utils';

/** Compact one-glyph chip summarising a PR's state + CI checks. */
export function PrStatusChip({
  status,
  className,
}: {
  status: PrStatus;
  className?: string;
}) {
  const t = useTranslations('task');
  const stateLabel = t(`pr.states.${status.state}`);
  const checksLabel =
    status.checks !== 'none' ? t('pr.chipChecks', { checks: t(`pr.checks.${status.checks}`) }) : '';
  const label = t('pr.chip', { number: status.number, state: stateLabel }) + checksLabel;
  const { icon, colour } = resolve(status);
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium', colour, className)}
      title={label}
      aria-label={label}
    >
      {icon}
      <span>{status.number}</span>
    </span>
  );
}

function resolve(status: PrStatus): { icon: React.ReactNode; colour: string } {
  if (status.state === 'merged') {
    return { icon: <GitMerge className="h-3 w-3" />, colour: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' };
  }
  if (status.state === 'closed') {
    return { icon: <XCircle className="h-3 w-3" />, colour: 'bg-muted text-muted-foreground' };
  }
  if (status.state === 'draft') {
    return { icon: <Circle className="h-3 w-3" />, colour: 'bg-muted text-muted-foreground' };
  }
  // open — colour by checks
  const CheckIcon = CHECK_ICON[status.checks];
  return { icon: <CheckIcon className="h-3 w-3" />, colour: CHECK_COLOUR[status.checks] };
}

const CHECK_COLOUR: Record<PrCheckState, string> = {
  passing: 'bg-green-500/15 text-green-700 dark:text-green-400',
  failing: 'bg-destructive/15 text-destructive',
  pending: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  none: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
};

const CHECK_ICON: Record<PrCheckState, typeof CheckCircle2> = {
  passing: CheckCircle2,
  failing: XCircle,
  pending: Circle,
  none: GitPullRequest,
};
