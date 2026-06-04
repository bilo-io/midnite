import type { Task } from '@midnite/shared';
import { gatewayUrl } from '@/lib/api';

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

export function TaskCard({ task, onSelect }: { task: Task; onSelect?: () => void }) {
  const kind = task.kind ?? 'unknown';
  const firstImage = task.attachments?.find((a) => a.mime.startsWith('image/'));
  const hue = KIND_HUE_VARS[kind];

  const body = (
    <>
      <div className="mb-1.5 flex items-center gap-2">
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
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {firstImage && (
        <img
          src={`${gatewayUrl()}/uploads/${firstImage.path}`}
          alt=""
          className="mt-2 max-h-24 w-full rounded border object-cover"
        />
      )}
    </>
  );

  const className =
    'group block w-full rounded-md border bg-background p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow';

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
