'use client';

import { useTranslations } from 'next-intl';
import { missingProjectRequirements, type Project } from '@midnite/shared';
import { useProjectRequirementLabel } from '@/lib/i18n-labels';
import { cn } from '@/lib/utils';

/**
 * An orange status circle shown on incomplete projects — those still missing a
 * name, tag or folder. The number inside is the count of outstanding items;
 * renders nothing once the project is complete.
 */
export function ProjectStatusBadge({ project, className }: { project: Project; className?: string }) {
  const t = useTranslations('projects');
  const requirementLabel = useProjectRequirementLabel();
  const missing = missingProjectRequirements(project);
  if (missing.length === 0) return null;
  const title = t('statusBadge.incomplete', {
    missing: missing.map(requirementLabel).join(t('statusBadge.separator')),
  });
  return (
    <span
      role="status"
      aria-label={title}
      title={title}
      className={cn(
        'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums text-white',
        className,
      )}
      // Amber/orange — same hue as the "awaiting input" session status.
      style={{ background: 'hsl(38 92% 50%)', boxShadow: '0 0 8px -1px hsl(38 92% 50% / 0.7)' }}
    >
      {missing.length}
    </span>
  );
}
