import type { Task } from '@midnite/shared';
import { gatewayUrl } from '@/lib/api';

const KIND_LABELS: Record<NonNullable<Task['kind']>, string> = {
  bug: 'Bug',
  feature: 'Feature',
  question: 'Question',
  chore: 'Chore',
  unknown: 'Task',
};

export function TaskCard({ task }: { task: Task }) {
  const firstImage = task.attachments?.find((a) => a.mime.startsWith('image/'));
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-secondary-foreground">
          {KIND_LABELS[task.kind ?? 'unknown']}
        </span>
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {firstImage && (
        <img
          src={`${gatewayUrl()}/uploads/${firstImage.path}`}
          alt=""
          className="mt-2 max-h-24 rounded border object-cover"
        />
      )}
    </div>
  );
}
