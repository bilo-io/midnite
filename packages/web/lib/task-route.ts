/**
 * Task detail routing (Phase 42 Theme B).
 *
 * Under static export (`output: 'export'`) Next.js intercepting routes aren't
 * available, so the "click a card → modal, share/refresh → full page" split is
 * done client-side:
 *
 * - **In-app** navigation opens the task as a modal overlay on the board via the
 *   `?task=<id>` query param ({@link taskModalHref}); the board stays mounted.
 * - **Hard navigation / a shared link** to the full page uses `/tasks/view?id=`
 *   ({@link taskPageHref}, Theme A).
 *
 * The legacy `?open=<id>` param (used by older links/notifications) redirects to
 * `?task=` for one release — see the redirect in `tasks-view.tsx`.
 */

/** Query param on `/tasks` that opens a task as a modal overlay. */
export const TASK_MODAL_PARAM = 'task';

/** Legacy modal param, kept as a redirect source for one release. */
export const TASK_MODAL_LEGACY_PARAM = 'open';

/** In-app link that opens `id` as a modal over the board. */
export function taskModalHref(id: string): string {
  return `/tasks?${TASK_MODAL_PARAM}=${encodeURIComponent(id)}`;
}

/** Full, shareable detail page for `id` (Theme A) — the hard-nav / share target. */
export function taskPageHref(id: string): string {
  return `/tasks/view?id=${encodeURIComponent(id)}`;
}
