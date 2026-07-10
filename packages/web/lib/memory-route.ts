/**
 * Memory detail routing (Phase 65 A).
 *
 * Under static export (`output: 'export'`) Next.js can't prerender arbitrary
 * ids, so — like `/projects/view`, `/sessions/view` — the memory workspace reads
 * its id from `?id=` and fetches client-side. Memory-list cards navigate here;
 * the modal is reserved for **New** (creating a memory).
 */

/** Full, shareable workspace page for `id` — the card-click + search-hit target. */
export function memoryPageHref(id: string): string {
  return `/memory/view?id=${encodeURIComponent(id)}`;
}
