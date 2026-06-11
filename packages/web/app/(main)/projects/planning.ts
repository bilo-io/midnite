/**
 * Per-project planning documents — concrete instances of a {@link Template}
 * created for a specific project. A project's docs are kept client-side
 * (localStorage, keyed by project id), mirroring how the template library
 * itself is persisted. Each doc copies its template's title and chip, while its
 * markdown body's title is personalised with the project name.
 */
import type { Template } from './templates';

export type PlanDoc = {
  id: string;
  /** The library template this doc was created from. */
  templateId: string;
  /** Mirrors the template's title field. */
  name: string;
  tag: string;
  color: string;
  /** The markdown body, with the project name woven into its title. */
  content: string;
};

const KEY_PREFIX = 'midnite.planning.';

export function loadPlanDocs(projectId: string): PlanDoc[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + projectId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PlanDoc[]) : [];
  } catch {
    return [];
  }
}

export function savePlanDocs(projectId: string, docs: PlanDoc[]): void {
  try {
    localStorage.setItem(KEY_PREFIX + projectId, JSON.stringify(docs));
  } catch {
    // best-effort; private mode / quota — keep the in-memory copy.
  }
}

/**
 * Weave the project name into the first markdown heading (`# Title` →
 * `# Title — Project`), leaving the rest of the body untouched. If the template
 * has no leading heading, prepend one built from the template title.
 */
function withProjectTitle(content: string, templateName: string, projectName: string): string {
  const lines = content.split('\n');
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx === -1) {
    return `# ${templateName} — ${projectName}\n\n${content}`;
  }
  lines[idx] = `${lines[idx]!.replace(/\s+$/, '')} — ${projectName}`;
  return lines.join('\n');
}

export function createDocFromTemplate(template: Template, projectName: string): PlanDoc {
  return {
    id: crypto.randomUUID(),
    templateId: template.id,
    name: template.name,
    tag: template.tag,
    color: template.color,
    content: withProjectTitle(template.content, template.name, projectName),
  };
}
