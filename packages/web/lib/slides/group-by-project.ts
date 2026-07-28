import type { Project } from '@midnite/shared';
import type { DeckSummary } from './store';

export type DeckProjectGroup = {
  key: string;
  /** The real project id (undefined for the synthetic "Unassigned" group). */
  projectId?: string;
  name: string;
  tag?: string;
  color?: string;
  decks: DeckSummary[];
};

/** Partition decks into per-project groups (in the project list's order), with an
 *  "Unassigned" group last. Only groups that actually hold decks are returned.
 *  Mirrors `groupTasksByProject` in `task-columns.ts` for the Tasks list view. */
export function groupDecksByProject(
  decks: DeckSummary[],
  projects: Project[],
  unassignedLabel: string,
): DeckProjectGroup[] {
  const byId = new Map<string, DeckSummary[]>();
  const unassigned: DeckSummary[] = [];
  for (const d of decks) {
    if (d.projectId) {
      const list = byId.get(d.projectId) ?? [];
      list.push(d);
      byId.set(d.projectId, list);
    } else {
      unassigned.push(d);
    }
  }
  const groups: DeckProjectGroup[] = [];
  for (const p of projects) {
    const list = byId.get(p.id);
    if (list && list.length > 0) {
      groups.push({ key: p.id, projectId: p.id, name: p.name, tag: p.tag, color: p.color, decks: list });
    }
  }
  if (unassigned.length > 0) {
    groups.push({ key: '__unassigned__', name: unassignedLabel, color: '#94a3b8', decks: unassigned });
  }
  return groups;
}
