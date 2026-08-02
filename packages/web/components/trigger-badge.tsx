import { CheckCircle2, Clock, MousePointerClick, Webhook, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { TriggerType } from '@midnite/shared';
import { cn } from '@/lib/utils';

// Icon + hue only — the label comes from `workflows.list.triggers.*`, the same keys
// the workflows table and create modal read, so the badge can't drift from them.
const META: Record<TriggerType, { Icon: LucideIcon; hue: string }> = {
  manual: { Icon: MousePointerClick, hue: '--status-backlog' },
  schedule: { Icon: Clock, hue: '--status-todo' },
  webhook: { Icon: Webhook, hue: '--kind-feature' },
  'task-event': { Icon: CheckCircle2, hue: '--status-done' },
};

export function TriggerBadge({ type, className }: { type: TriggerType; className?: string }) {
  const t = useTranslations('workflows');
  const meta = META[type];
  const Icon = meta.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        className,
      )}
      style={{
        borderColor: `hsl(var(${meta.hue}) / 0.4)`,
        color: `hsl(var(${meta.hue}))`,
        background: `hsl(var(${meta.hue}) / 0.08)`,
      }}
    >
      <Icon className="h-3 w-3" />
      {t(`list.triggers.${type}`)}
    </span>
  );
}
