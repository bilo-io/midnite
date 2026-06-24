import type { WorkflowTemplateSummary } from '@midnite/shared';

const DASH = '—';

/** Table rows for `template list`: slug → name → category → tags → slots. */
export function templateListRows(templates: WorkflowTemplateSummary[]): string[][] {
  return templates.map((t) => [
    t.slug,
    t.name,
    t.category,
    t.tags.join(', ') || DASH,
    t.credentialSlots.length > 0 ? t.credentialSlots.map((s) => s.key).join(', ') : DASH,
  ]);
}

/**
 * Parse a repeatable `--cred slot=credId` flag value into a key→value pair.
 * Throws if the format is wrong.
 */
export function parseCredFlag(raw: string): [string, string] {
  const eq = raw.indexOf('=');
  if (eq < 1 || eq === raw.length - 1) {
    throw new Error(`invalid --cred "${raw}" — expected format: slot=credentialId`);
  }
  return [raw.slice(0, eq), raw.slice(eq + 1)];
}
