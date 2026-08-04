import { useTranslations } from 'next-intl';
import type {
  CheckTrigger,
  CouncilMemberRunStatus,
  CouncilRunStatus,
  MemoryArtifactKind,
  MemoryArtifactStatus,
  PrMergeMethod,
  PrReviewEvent,
  ProjectRequirement,
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

/**
 * The projects domain (Phase 82 Theme D). `PROJECT_REQUIREMENTS` in
 * `@midnite/shared` is the canonical machine list; the reader-facing wording for
 * each missing requirement lives in the `projects` catalog so the status badge and
 * any future "finish setting up" surface share one phrasing.
 */

/** Missing project requirement → clause inside the incomplete-badge title (`projects.requirements.*`). */
export function useProjectRequirementLabel(): (requirement: ProjectRequirement) => string {
  const t = useTranslations('projects');
  return (requirement) => t(`requirements.${requirement}`);
}

/**
 * The PR-review / quality-gate domain (Phase 82 Theme D). The diff viewer, the
 * review action bar and the checks panel all render these enums, so the wording
 * lives in one place rather than in three local `Record<Enum, string>` maps.
 * Keys live in `prReview`.
 */

/** Diff file status → per-file badge (`prReview.diffStatus.*`). */
export function useDiffStatusLabel(): (status: DiffFileStatus) => string {
  const t = useTranslations('prReview');
  return (status) => t(`diffStatus.${status}`);
}

/** Review event → segmented-control label (`prReview.events.*`). */
export function useReviewEventLabel(): (event: PrReviewEvent) => string {
  const t = useTranslations('prReview');
  return (event) => t(`events.${event}`);
}

/** AI-review verdict → banner label (`prReview.aiVerdict.*`). */
export function useAiVerdictLabel(): (verdict: AiReviewVerdict) => string {
  const t = useTranslations('prReview');
  return (verdict) => t(`aiVerdict.${verdict}`);
}

/** Merge method → `<option>` label (`prReview.mergeMethods.*`). */
export function useMergeMethodLabel(): (method: PrMergeMethod) => string {
  const t = useTranslations('prReview');
  return (method) => t(`mergeMethods.${method}`);
}

/** Check-run trigger → run-summary chip (`prReview.checks.triggers.*`). */
export function useCheckTriggerLabel(): (trigger: CheckTrigger) => string {
  const t = useTranslations('prReview');
  return (trigger) => t(`checks.triggers.${trigger}`);
}

/**
 * react-diff-view's `DiffType`, restated locally: the library's own type isn't
 * exported from a stable entry point and `lib/` must not import a component
 * module. `diff-model.ts` maps the shared `PrDiffFile['status']` onto exactly
 * these five values.
 */
export type DiffFileStatus = 'add' | 'delete' | 'modify' | 'rename' | 'copy';

/** The Phase 37 AI-review verdicts the diff banner renders. */
export type AiReviewVerdict = 'approved' | 'commented' | 'changes-requested';
