import type {
  Council,
  Digest,
  Idea,
  Memory,
  Milestone,
  Note,
  Project,
  SearchType,
  Task,
  TaskRetro,
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

export function memoryToIndexDoc(m: Memory, sourceTexts: string[] = []): IndexDoc {
  // Phase 65 B: fold ingested source text into the body so a memory is findable
  // by its sources' content too (bounded by MAX_BODY like every other domain).
  return {
    type: 'memory',
    entityId: m.id,
    teamId: null,
    title: m.title,
    body: joinBody([m.content, ...sourceTexts]),
  };
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

export function milestoneToIndexDoc(
  m: Pick<Milestone, 'id' | 'name' | 'description' | 'teamId'>,
): IndexDoc {
  return { type: 'milestone', entityId: m.id, teamId: m.teamId ?? null, title: m.name, body: clip(m.description ?? '') };
}

/** A fleet digest (Phase 62 G) — headline as title, the rendered markdown as body. */
export function digestToIndexDoc(d: Digest): IndexDoc {
  return { type: 'digest', entityId: d.id, teamId: null, title: d.headline, body: clip(d.markdown) };
}

/**
 * A task retrospective (Phase 62 G). Keyed by `taskId` (routes to the task's
 * detail, where the retro renders). The searchable text is the LLM narrative +
 * failure detail; a skeleton-only retro (no narrative) still indexes its outcome
 * + failures so "that abandoned task" stays findable.
 */
export function retroToIndexDoc(r: TaskRetro): IndexDoc {
  const title = r.narrative?.whatHappened?.slice(0, 80) || `${r.outcome} retrospective`;
  const body = joinBody([
    r.narrative?.whatHappened,
    r.narrative?.whatTrippedIt,
    ...(r.narrative?.notable ?? []),
    ...r.failures.map((f) => `${f.class}: ${f.detail}`),
  ]);
  return { type: 'retro', entityId: r.taskId, teamId: null, title, body };
}

/** Where the client should navigate to open a result of the given type. */
export function routeFor(type: SearchType, id: string): string {
  switch (type) {
    case 'task':
      return '/tasks';
    case 'project':
      return '/projects';
    case 'memory':
      return `/memory/view?id=${encodeURIComponent(id)}`;
    case 'note':
      // Notes live on the dashboard (NotesPanel), not a dedicated route.
      return '/dashboard';
    case 'council':
      return `/councils/${id}`;
    case 'workflow':
      return `/workflows/edit?id=${encodeURIComponent(id)}`;
    case 'idea':
      return `/ideas/${id}`;
    case 'milestone':
      // Milestones live under a project roadmap (Theme E). Until that route
      // lands, route to the projects surface (parity with task/project).
      return '/projects';
    case 'digest':
      // The digest feed opens the matched digest inline via its id.
      return `/digests?id=${encodeURIComponent(id)}`;
    case 'retro':
      // A retro's entity id is its taskId; the task detail renders the retro.
      return `/tasks/view?id=${encodeURIComponent(id)}`;
  }
}
