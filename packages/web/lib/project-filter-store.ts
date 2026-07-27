import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * The global project filter (titlebar) — one selection that scopes every
 * project-aware view (tasks, sessions, slides), replacing the per-view,
 * URL-backed `?project=` dropdown each of those views used to render on its
 * own. Values are project ids, plus the shared `UNASSIGNED_PROJECT_ID`
 * sentinel for "no project" (only tasks/slides have that bucket; a view
 * without one simply never matches it).
 *
 * Persisted to localStorage (not the URL) so the selection survives
 * navigation between views and reloads — the tradeoff for a *global* filter
 * is that a single view's slice of it is no longer independently
 * shareable/bookmarkable via a link.
 */
type ProjectFilterState = {
  selected: string[];
  toggle: (id: string) => void;
  clear: () => void;
};

export const useProjectFilterStore = create<ProjectFilterState>()(
  persist(
    (set) => ({
      selected: [],
      toggle: (id) =>
        set((s) => ({
          selected: s.selected.includes(id)
            ? s.selected.filter((v) => v !== id)
            : [...s.selected, id],
        })),
      clear: () => set({ selected: [] }),
    }),
    { name: 'midnite:project-filter' },
  ),
);
