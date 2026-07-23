import { useTranslations } from 'next-intl';
import type { Status, TaskHeldReason, TaskSummary, WaitReason } from '@midnite/shared';

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
