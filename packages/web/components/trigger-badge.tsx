import { Clock, MousePointerClick, Webhook, type LucideIcon } from 'lucide-react';
import type { TriggerType } from '@midnite/shared';
import { cn } from '@/lib/utils';

const META: Record<TriggerType, { label: string; Icon: LucideIcon; hue: string }> = {
  manual: { label: 'Manual', Icon: MousePointerClick, hue: '--status-backlog' },
  schedule: { label: 'Schedule', Icon: Clock, hue: '--status-todo' },
  webhook: { label: 'Webhook', Icon: Webhook, hue: '--kind-feature' },
};

export function TriggerBadge({ type, className }: { type: TriggerType; className?: string }) {
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
      {meta.label}
    </span>
  );
}
