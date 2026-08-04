import { useTranslations } from 'next-intl';
import type {
  CouncilMemberRunStatus,
  CouncilRunStatus,
  MemoryArtifactKind,
  MemoryArtifactStatus,
  SourceIngestState,
  Status,
  TaskHeldReason,
  TaskSummary,
  WaitReason,
} from '@midnite/shared';

/**
 * Translated label lookups for the task domain enums (Phase 82 Theme B).
 * One hook per enum so every surface (cards, rows, chips, palette, table
 * sections) renders the same translated copy from a single set of keys —
 * the web-side i18n counterpart of the English maps in `@midnite/shared`
 * (`WAIT_REASON_LABEL`, `TASK_HELD_REASON_LABEL`), which stay canonical for
 * the CLI/gateway. Keys live in the `board` namespace.
 */

export type TaskKind = NonNullable<TaskSummary['kind']>;

/** Status → column label (`board.columns.*` — the same keys the board columns use). */
export function useStatusLabel(): (status: Status) => string {
  const t = useTranslations('board');
  return (status) => t(`columns.${status}`);
}

/** Task kind → chip label (`board.kinds.*`). */
export function useKindLabel(): (kind: TaskKind) => string {
  const t = useTranslations('board');
  return (kind) => t(`kinds.${kind}`);
}

/** Wait reason → chip/notification label (`board.waitReasons.*`). */
export function useWaitReasonLabel(): (reason: WaitReason) => string {
  const t = useTranslations('board');
  return (reason) => t(`waitReasons.${reason}`);
}

/** Held reason → chip label (`board.heldReasons.*`). */
export function useHeldReasonLabel(): (reason: TaskHeldReason) => string {
  const t = useTranslations('board');
  return (reason) => t(`heldReasons.${reason}`);
}

/**
 * The memory domain's enums (Phase 82 Theme D). `MEMORY_ARTIFACT_META` in
 * `@midnite/shared` keeps its English `label` — shared stays i18n-agnostic for the
 * CLI/gateway — so the web surfaces translate the *kind* here instead, and the
 * Studio rail, the artifact viewer and the source detail modal all read one set of
 * keys rather than keeping three copies of the wording. Keys live in `memory`.
 */

/** Artifact kind → row/menu label (`memory.kinds.*`). */
export function useArtifactKindLabel(): (kind: MemoryArtifactKind) => string {
  const t = useTranslations('memory');
  return (kind) => t(`kinds.${kind}`);
}

/** Artifact generation status → chip label (`memory.artifactStatus.*`). */
export function useArtifactStatusLabel(): (status: MemoryArtifactStatus) => string {
  const t = useTranslations('memory');
  return (status) => t(`artifactStatus.${status}`);
}

/** Source ingestion state → chip label (`memory.sourceState.*`). */
export function useSourceIngestStateLabel(): (state: SourceIngestState) => string {
  const t = useTranslations('memory');
  return (state) => t(`sourceState.${state}`);
}

/**
 * The council domain's run/member status enums (Phase 82 Theme D). The *colour*
 * mapping stays with the pill that renders it (`STATUS_PILL` in
 * `components/council-run-thread`); only the wording moves here, so the councils
 * thread, the run tabs and the project cockpit's Docs tab share one set of keys.
 * Keys live in `council`.
 */

/** Run status → thread/pill label (`council.runStatus.*`). */
export function useCouncilRunStatusLabel(): (status: CouncilRunStatus) => string {
  const t = useTranslations('council');
  return (status) => t(`runStatus.${status}`);
}

/** Member status → tab/output label (`council.run.memberStatus.*`). */
export function useCouncilMemberStatusLabel(): (status: CouncilMemberRunStatus) => string {
  const t = useTranslations('council');
  return (status) => t(`run.memberStatus.${status}`);
}
