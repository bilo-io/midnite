import type { IdeaStatus } from '@midnite/shared';
import { cn } from '@/lib/utils';

const LABEL: Record<IdeaStatus, string> = {
  draft: 'Draft',
  refined: 'Refined',
  promoted: 'Promoted',
};

const STYLE: Record<IdeaStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  refined: 'bg-blue-500/15 text-blue-500',
  promoted: 'bg-primary/15 text-primary',
};

export function IdeaStatusChip({ status }: { status: IdeaStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        STYLE[status],
      )}
    >
      {LABEL[status]}
    </span>
  );
}
