'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { assignTaskMilestone, listMilestones } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useApiData } from '@/lib/use-api-data';
import { StyledSelect } from '@/components/ui/styled-select';
import { useToast } from '@/components/toast';

type Props = {
  taskId: string;
  /** The task's project; milestones are project-scoped, so no project → no picker. */
  projectId: string | null;
  currentMilestoneId?: string;
};

/**
 * Phase 58 E — assign a task to one of its project's milestones (or clear it)
 * from the task detail. The roadmap's drag-to-assign is the other surface; this
 * writes the same `PATCH /tasks/:id/milestone`.
 */
export function TaskMilestonePicker({ taskId, projectId, currentMilestoneId }: Props) {
  const t = useTranslations('task');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data: milestones } = useApiData(
    () => (projectId ? listMilestones(projectId) : Promise.resolve([])),
    [projectId],
  );

  const options = useMemo(
    () => [
      { value: '', label: t('milestone.none') },
      ...(milestones ?? []).map((m) => ({ value: m.id, label: m.name })),
    ],
    [milestones, t],
  );

  if (!projectId) {
    return <p className="text-xs text-muted-foreground">{t('milestone.needsProject')}</p>;
  }
  if ((milestones ?? []).length === 0) {
    return <p className="text-xs text-muted-foreground">{t('milestone.noMilestones')}</p>;
  }

  const assign = async (next: string) => {
    setBusy(true);
    try {
      await assignTaskMilestone(taskId, next || null);
      invalidateData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('milestone.assignFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StyledSelect
      aria-label={t('milestone.pickerAria')}
      options={options}
      value={currentMilestoneId ?? ''}
      onChange={(v) => void assign(v)}
      disabled={busy}
      className="w-full"
    />
  );
}
