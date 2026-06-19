/**
 * Pure markdown serializer for a council run — the first consumer of the report
 * export framework (`shared/src/report.ts`). Given a council and one of its runs,
 * it builds a clean, self-contained document:
 *
 *   # <council name> — <format label>
 *   *Exported …* · prompt
 *   ## Synthesis — <active format label>   (+ a label legend if anonymized)
 *   ## Archived syntheses                  (the other per-format entries, if any)
 *   ## Members                             (each member's role/provider + output)
 *
 * It has no DB or Nest dependency: the caller (the service) hands it already-
 * hydrated `Council` + `CouncilRun` shapes, so it stays trivially unit-testable.
 * Anonymized syntheses reference members blind (A/B/C); for those we emit a small
 * legend derived from the entry's `labelMap` so the A/B/C references resolve back
 * to member names.
 */

import {
  AGENT_CLI_LABEL,
  COUNCIL_FORMATS_META,
  type Council,
  type CouncilRun,
  type CouncilRunMember,
  type CouncilSynthesisEntry,
} from '@midnite/shared';

const MEMBER_STATUS_LABEL: Record<CouncilRunMember['status'], string> = {
  running: 'still running',
  succeeded: 'responded',
  failed: 'failed',
  timeout: 'timed out',
  skipped: 'skipped',
};

/** A member's display name, falling back to a 1-based positional label. */
function memberName(member: CouncilRunMember | undefined, index: number): string {
  return member?.name.trim() || `Member ${index + 1}`;
}

/** All settled syntheses for the run, newest representation first, with a legacy
 *  fallback to the single active `synthesis` for runs predating per-format archiving. */
function synthesisEntries(run: CouncilRun): CouncilSynthesisEntry[] {
  if (run.syntheses.length > 0) return run.syntheses;
  if (run.synthesis) {
    return [
      {
        format: run.format,
        synthesis: run.synthesis,
        synthProvider: run.synthProvider,
        anonymized: false,
        finishedAt: run.finishedAt ?? '',
      },
    ];
  }
  return [];
}

/** The A → member-name legend for an anonymized synthesis, or `null` when the
 *  entry is attributed (or has no map to resolve). */
function anonymizationLegend(run: CouncilRun, entry: CouncilSynthesisEntry): string | null {
  if (!entry.anonymized || !entry.labelMap) return null;
  const lines = Object.entries(entry.labelMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, runMemberId]) => {
      const index = run.members.findIndex((m) => m.id === runMemberId);
      const name = memberName(run.members[index], index);
      return `- **${label}** → ${name}`;
    });
  if (lines.length === 0) return null;
  return ['_Label legend (de-anonymized):_', '', ...lines].join('\n');
}

/** Render one synthesis entry as a section: a format-labelled heading, an optional
 *  de-anonymization legend, then the synthesis markdown. */
function renderSynthesis(
  run: CouncilRun,
  entry: CouncilSynthesisEntry,
  headingPrefix: string,
): string {
  const label = COUNCIL_FORMATS_META[entry.format].label;
  const parts: string[] = [`## ${headingPrefix} — ${label}`];
  const legend = anonymizationLegend(run, entry);
  if (legend) parts.push(legend);
  parts.push(entry.synthesis.trim() || '_(no synthesis recorded)_');
  return parts.join('\n\n');
}

/** Render a single member's contribution: name, role, provider, status, output. */
function renderMember(member: CouncilRunMember, index: number): string {
  const heading = `### ${memberName(member, index)}`;
  const meta: string[] = [`*${AGENT_CLI_LABEL[member.provider]} · ${MEMBER_STATUS_LABEL[member.status]}*`];
  if (member.role.trim()) meta.push(`**Role:** ${member.role.trim()}`);
  const body =
    member.status === 'succeeded' || member.output?.trim()
      ? (member.output?.trim() ?? '_(no output captured)_')
      : member.error?.trim()
        ? `_Error: ${member.error.trim()}_`
        : '_(no output captured)_';
  return [heading, meta.join('  \n'), body].join('\n\n');
}

export type CouncilReportOptions = {
  /** When the report is generated; defaults to now. Injectable for stable tests. */
  now?: Date;
};

/**
 * Serialize a council run as a standalone markdown document. Pure: same inputs →
 * same output (modulo the `now` timestamp, which is injectable).
 */
export function buildCouncilRunReport(
  council: Council,
  run: CouncilRun,
  options: CouncilReportOptions = {},
): string {
  const now = options.now ?? new Date();
  const entries = synthesisEntries(run);
  // The active synthesis is the run's current `format`; the rest are archived.
  const activeIndex = entries.findIndex((e) => e.format === run.format);
  const active = activeIndex >= 0 ? entries[activeIndex] : entries[0];
  const archived = entries.filter((e) => e !== active);

  const title = `# ${council.name.trim() || 'Council'} — ${COUNCIL_FORMATS_META[run.format].label}`;
  const exportedAt = `*Exported ${now.toISOString().slice(0, 10)}*`;

  const sections: string[] = [title, exportedAt];

  sections.push(['## Prompt', run.prompt.trim() || '_(no prompt)_'].join('\n\n'));

  if (active) {
    sections.push(renderSynthesis(run, active, 'Synthesis'));
  } else {
    sections.push(['## Synthesis', '_No synthesis recorded._'].join('\n\n'));
  }

  if (archived.length > 0) {
    sections.push('## Archived syntheses');
    for (const entry of archived) {
      sections.push(renderSynthesis(run, entry, 'Synthesis'));
    }
  }

  sections.push('## Members');
  if (run.members.length === 0) {
    sections.push('_No members participated._');
  } else {
    run.members.forEach((member, index) => {
      sections.push(renderMember(member, index));
    });
  }

  // A single trailing newline — POSIX-clean text file.
  return `${sections.join('\n\n')}\n`;
}

/** A safe, descriptive download filename for a council run report. */
export function councilReportFilename(council: Council, run: CouncilRun): string {
  const slug = (council.name.trim() || 'council')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const date = (run.finishedAt ?? run.startedAt).slice(0, 10);
  return `${slug || 'council'}-${run.format}-${date}.md`;
}
