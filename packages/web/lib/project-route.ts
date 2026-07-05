/**
 * Project detail routing (Phase 55).
 *
 * Under static export (`output: 'export'`) Next.js can't prerender arbitrary
 * ids, so — like `/tasks/view`, `/sessions/view` — the project detail page reads
 * its id from `?id=` and fetches client-side. Projects-list cards navigate here;
 * the modal is reserved for **New** and the office board room.
 *
 * The legacy `?open=<id>` param on `/projects` (older links / promoted-idea
 * chips) redirects here for one release — see the redirect in `projects-view.tsx`.
 */

/** Legacy param on `/projects` that used to open a project's edit modal. */
export const PROJECT_MODAL_LEGACY_PARAM = 'open';

/** Full, shareable detail page for `id` — the card-click + hard-nav target. */
export function projectPageHref(id: string): string {
  return `/projects/view?id=${encodeURIComponent(id)}`;
}
