import type {
  Council,
  Idea,
  Memory,
  Note,
  Project,
  SearchType,
  Task,
  Workflow,
} from '@midnite/shared';

/**
 * The per-domain mapping (which fields → `title`/`body`) lives here, in one
 * obvious place, so it stays consistent between boot backfill and the per-domain
 * write-path. A new searchable domain adds its mapper here.
 */

/** A row destined for the FTS index: the lookup keys plus the indexed text. */
export type IndexDoc = {
  type: SearchType;
  entityId: string;
  /** Team scope — null means visible to all authenticated users (personal / legacy). */
  teamId: string | null;
  title: string;
  body: string;
};

/** Keep indexed bodies bounded — FTS doesn't need the whole of a long plan. */
const MAX_BODY = 4_000;
const clip = (text: string): string => (text.length > MAX_BODY ? text.slice(0, MAX_BODY) : text);
const joinBody = (parts: Array<string | undefined | null>): string =>
  clip(parts.filter((p): p is string => Boolean(p && p.trim())).join('\n\n'));

export function taskToIndexDoc(t: Task): IndexDoc {
  return { type: 'task', entityId: t.id, teamId: t.teamId ?? null, title: t.title, body: clip(t.prompt ?? '') };
}

export function projectToIndexDoc(p: Project): IndexDoc {
  return { type: 'project', entityId: p.id, teamId: p.teamId ?? null, title: p.name, body: joinBody([p.description, p.plan]) };
}

// Memories, notes, and councils have no team_id — they are personal entities
// visible to all authenticated users (teamId = null in the index).

export function memoryToIndexDoc(m: Memory): IndexDoc {
  return { type: 'memory', entityId: m.id, teamId: null, title: m.title, body: clip(m.content) };
}

export function noteToIndexDoc(n: Note): IndexDoc {
  // Notes have no title — use the first line (capped) as a stand-in.
  const firstLine = n.content.split('\n', 1)[0] ?? '';
  return { type: 'note', entityId: n.id, teamId: null, title: firstLine.slice(0, 80), body: clip(n.content) };
}

export function councilToIndexDoc(c: Council): IndexDoc {
  return {
    type: 'council',
    entityId: c.id,
    teamId: null,
    title: c.name,
    body: joinBody([c.description, c.customPrompt]),
  };
}

export function workflowToIndexDoc(w: Pick<Workflow, 'id' | 'name' | 'description' | 'teamId'>): IndexDoc {
  return { type: 'workflow', entityId: w.id, teamId: w.teamId ?? null, title: w.name, body: clip(w.description ?? '') };
}

export function ideaToIndexDoc(i: Pick<Idea, 'id' | 'title' | 'body' | 'teamId'>): IndexDoc {
  return { type: 'idea', entityId: i.id, teamId: i.teamId ?? null, title: i.title, body: clip(i.body) };
}

/** Where the client should navigate to open a result of the given type. */
export function routeFor(type: SearchType, id: string): string {
  switch (type) {
    case 'task':
      return '/tasks';
    case 'project':
      return '/projects';
    case 'memory':
      return '/memory';
    case 'note':
      // Notes live on the dashboard (NotesPanel), not a dedicated route.
      return '/dashboard';
    case 'council':
      return `/councils/${id}`;
    case 'workflow':
      return `/workflows/edit?id=${encodeURIComponent(id)}`;
    case 'idea':
      return `/ideas/${id}`;
  }
}
