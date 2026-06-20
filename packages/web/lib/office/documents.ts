/**
 * Assembles the "documents" shown in the board room for a project. A project's
 * documents are its **plan** (markdown) plus any **memories** scoped to that
 * project — both are authored markdown the team plans against. Pure data shaping
 * (no Phaser, no React) so it's easy to test/reuse.
 */

import type { Memory, Project } from '@midnite/shared';

export type BoardroomDocKind = 'plan' | 'memory';

export interface BoardroomDoc {
  id: string;
  title: string;
  content: string;
  kind: BoardroomDocKind;
  projectId: string;
  projectName: string;
  tag: string;
  color: string;
}

export type ProjectFilter = 'all' | string;

/** Active (non-archived) projects, for the board-room filter dropdown. */
export function boardroomProjects(projects: Project[]): Project[] {
  return projects.filter((p) => !p.archived).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Documents for the selected project filter — each project's plan first, then its
 * scoped memories. `'all'` returns documents across every active project.
 */
export function boardroomDocs(projects: Project[], memories: Memory[], filter: ProjectFilter): BoardroomDoc[] {
  const active = boardroomProjects(projects).filter((p) => filter === 'all' || p.id === filter);
  const docs: BoardroomDoc[] = [];
  for (const p of active) {
    const meta = { projectId: p.id, projectName: p.name, tag: p.tag, color: p.color };
    if (p.plan && p.plan.trim()) {
      docs.push({ id: `plan-${p.id}`, title: `${p.name} — Plan`, content: p.plan, kind: 'plan', ...meta });
    }
    for (const m of memories) {
      if (m.projectId !== p.id || m.archived) continue;
      docs.push({ id: m.id, title: m.title, content: m.content, kind: 'memory', ...meta });
    }
  }
  return docs;
}
