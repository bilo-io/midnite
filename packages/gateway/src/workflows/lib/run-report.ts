/**
 * Pure markdown serializer for a workflow run — the third consumer of the report
 * export framework (`shared/src/report.ts`). Given a workflow + run (with
 * per-node input/resolvedParams/output already hydrated), it builds:
 *
 *   # <workflow name> — Run
 *   *Exported …* · trigger · status · timing
 *   ## Nodes  (one subsection per node)
 *   ### <label or type> — <status>
 *   **Input** / **Resolved params** / **Output** / **Error**
 *
 * No DB or Nest dependency — the caller hands it already-hydrated shapes.
 */

import type { NodeRun, WorkflowRun } from '@midnite/shared';
import type { Workflow } from '@midnite/shared';

const STATUS_EMOJI: Record<string, string> = {
  queued: '⏳',
  running: '🔄',
  succeeded: '✅',
  failed: '❌',
  canceled: '🚫',
  pending: '⏳',
  skipped: '⏭️',
};

function jsonBlock(value: unknown): string {
  if (value === undefined || value === null) return '_none_';
  const str =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return ['```json', str, '```'].join('\n');
}

function nodeLabel(nodeRun: NodeRun, workflow: Workflow): string {
  const node = workflow.nodes.find((n) => n.id === nodeRun.nodeId);
  return node?.label?.trim() || nodeRun.nodeType;
}

function renderNodeRun(nodeRun: NodeRun, workflow: Workflow): string {
  const label = nodeLabel(nodeRun, workflow);
  const emoji = STATUS_EMOJI[nodeRun.status] ?? '';
  const heading = `### ${label} — ${emoji} ${nodeRun.status}`;

  const parts: string[] = [heading];

  const timing: string[] = [];
  if (nodeRun.startedAt) timing.push(`started ${nodeRun.startedAt.slice(0, 19).replace('T', ' ')}`);
  if (nodeRun.finishedAt) timing.push(`finished ${nodeRun.finishedAt.slice(0, 19).replace('T', ' ')}`);
  if (timing.length) parts.push(`*${timing.join(' · ')}*`);

  if (nodeRun.input !== undefined) {
    parts.push(['**Input**', jsonBlock(nodeRun.input)].join('\n\n'));
  }

  if (nodeRun.resolvedParams !== undefined) {
    parts.push(['**Resolved params**', jsonBlock(nodeRun.resolvedParams)].join('\n\n'));
  }

  if (nodeRun.output !== undefined) {
    parts.push(['**Output**', jsonBlock(nodeRun.output)].join('\n\n'));
  }

  if (nodeRun.error) {
    parts.push(['**Error**', `> ${nodeRun.error.trim()}`].join('\n\n'));
  }

  return parts.join('\n\n');
}

export type RunReportOptions = {
  now?: Date;
};

/**
 * Serialize a workflow run as a standalone markdown document.
 * Pure: same inputs → same output (modulo the `now` timestamp, injectable).
 */
export function runToMarkdown(
  workflow: Workflow,
  run: WorkflowRun,
  options: RunReportOptions = {},
): string {
  const now = options.now ?? new Date();
  const emoji = STATUS_EMOJI[run.status] ?? '';
  const title = `# ${workflow.name.trim() || 'Workflow'} — Run`;
  const exportedAt = `*Exported ${now.toISOString().slice(0, 10)}*`;

  const meta: string[] = [
    `**Trigger:** ${workflow.trigger.type}`,
    `**Status:** ${emoji} ${run.status}`,
  ];
  if (run.startedAt) meta.push(`**Started:** ${run.startedAt.slice(0, 19).replace('T', ' ')}`);
  if (run.finishedAt) meta.push(`**Finished:** ${run.finishedAt.slice(0, 19).replace('T', ' ')}`);

  const sections: string[] = [title, exportedAt, meta.join('  \n')];

  if (run.error) {
    sections.push(['## Run error', `> ${run.error.trim()}`].join('\n\n'));
  }

  if (run.nodeRuns.length > 0) {
    sections.push('## Nodes');
    for (const nr of run.nodeRuns) {
      sections.push(renderNodeRun(nr, workflow));
    }
  } else {
    sections.push('## Nodes\n\n_No node runs recorded._');
  }

  return `${sections.join('\n\n')}\n`;
}

/** A safe, descriptive download filename for a workflow run report. */
export function runReportFilename(workflow: Workflow, run: WorkflowRun): string {
  const slug = (workflow.name.trim() || 'workflow')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  const date = (run.finishedAt ?? run.startedAt).slice(0, 10);
  return `${slug || 'workflow'}-run-${date}.md`;
}
