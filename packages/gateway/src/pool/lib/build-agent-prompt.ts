import type { GlobalSource } from '@midnite/shared';

/**
 * Compose the prompt handed to an autonomous agent session: the task's own
 * prompt, followed by the midnite knowledge-base links as reference context.
 * Pure — exported for testing.
 */
export function buildAgentPrompt(taskPrompt: string, sources: GlobalSource[]): string {
  const base = taskPrompt.trim();
  if (sources.length === 0) return base;
  const lines = sources.map((s) => {
    const label = s.title?.trim();
    return label ? `- ${label} — ${s.url}` : `- ${s.url}`;
  });
  return `${base}\n\n## Reference material (midnite knowledge base)\n${lines.join('\n')}`;
}
