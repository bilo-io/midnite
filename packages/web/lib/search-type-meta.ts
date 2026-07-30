import {
  BrainCircuit,
  CirclePile,
  Folder,
  ListChecks,
  Milestone,
  Newspaper,
  StickyNote,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { SearchType } from '@midnite/shared';

const TYPE_ICONS: Record<SearchType, LucideIcon> = {
  task: ListChecks,
  project: Folder,
  memory: BrainCircuit,
  note: StickyNote,
  council: CirclePile,
  workflow: Workflow,
  milestone: Milestone,
  digest: Newspaper,
};

/**
 * Search-result type → icon + translated label, shared by the command palette
 * and the `/search` results page so both surfaces stay in lockstep (Phase 82
 * Theme D). `t` is the caller's own `useTranslations('search')` — this stays a
 * plain helper rather than a hook so it doesn't fight the rules of hooks.
 */
export function searchTypeMeta(
  t: (key: string) => string,
): Record<SearchType, { label: string; Icon: LucideIcon }> {
  return {
    task: { label: t('typeMeta.task'), Icon: TYPE_ICONS.task },
    project: { label: t('typeMeta.project'), Icon: TYPE_ICONS.project },
    memory: { label: t('typeMeta.memory'), Icon: TYPE_ICONS.memory },
    note: { label: t('typeMeta.note'), Icon: TYPE_ICONS.note },
    council: { label: t('typeMeta.council'), Icon: TYPE_ICONS.council },
    workflow: { label: t('typeMeta.workflow'), Icon: TYPE_ICONS.workflow },
    milestone: { label: t('typeMeta.milestone'), Icon: TYPE_ICONS.milestone },
    digest: { label: t('typeMeta.digest'), Icon: TYPE_ICONS.digest },
  };
}
