import type { Project, ProjectDoc } from '@midnite/shared';

/**
 * Build the one-shot CLI prompt for a Stage 1 execution-plan overview: the
 * project's name/description/existing plan, plus the full content of every
 * selected doc, clearly labeled. Pure — exported for testing.
 */
export function buildOverviewPrompt(project: Project, docs: ProjectDoc[]): string {
  const parts: (string | null)[] = [
    'Draft a high-level execution-plan overview for this project: the goals, ' +
      'the major phases or milestones, and the key risks or open questions. ' +
      'Write it as concise GitHub-Flavored Markdown prose with section headings — ' +
      'this is a review document, not a task list.',
    `Project: ${project.name}`,
    project.description ? `Description:\n${project.description}` : null,
    project.plan ? `Existing plan:\n${project.plan}` : null,
  ];
  if (docs.length > 0) {
    parts.push('Context documents:');
    for (const doc of docs) {
      parts.push(`### ${doc.name}\n${doc.content}`);
    }
  }
  return parts.filter((p): p is string => p !== null).join('\n\n');
}
