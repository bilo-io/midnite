import { z } from 'zod';

/**
 * A phase doc is a markdown file living in a project's linked GitHub repo under
 * `.midnite/phases/`. midnite reads/writes it through the GitHub Contents API,
 * so the git blob `sha` is part of the contract — updates and deletes must echo
 * the current sha back (optimistic concurrency).
 */
export const PhaseDocSchema = z.object({
  /** File name within `.midnite/phases/`, e.g. `"auth-revamp.md"`. */
  name: z.string(),
  /** Full repo path, e.g. `".midnite/phases/auth-revamp.md"`. */
  path: z.string(),
  /** Git blob SHA — required to update/delete the file via the Contents API. */
  sha: z.string(),
  /** Markdown body. Empty in list responses — fetched per-file via `get`. */
  content: z.string(),
  /** ISO timestamp of the last edit, when the backend can resolve it. */
  updatedAt: z.string().optional(),
});
export type PhaseDoc = z.infer<typeof PhaseDocSchema>;

export const PhaseDocsResponseSchema = z.object({ docs: z.array(PhaseDocSchema) });
export type PhaseDocsResponse = z.infer<typeof PhaseDocsResponseSchema>;

export const PhaseDocResponseSchema = z.object({ doc: PhaseDocSchema });
export type PhaseDocResponse = z.infer<typeof PhaseDocResponseSchema>;

/** Max markdown body length accepted for a phase doc (generous — docs are prose). */
export const MAX_PHASE_DOC_BYTES = 500_000;

export const CreatePhaseDocRequestSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(200),
  content: z.string().max(MAX_PHASE_DOC_BYTES),
});
export type CreatePhaseDocRequest = z.infer<typeof CreatePhaseDocRequestSchema>;

export const UpdatePhaseDocRequestSchema = z.object({
  content: z.string().max(MAX_PHASE_DOC_BYTES),
  sha: z.string().min(1, 'sha is required'),
});
export type UpdatePhaseDocRequest = z.infer<typeof UpdatePhaseDocRequestSchema>;

/**
 * Sanitise a user-supplied phase-doc name into a `<slug>.md` filename. Lower-cased,
 * non-alphanumerics collapsed to single hyphens, trimmed; falls back to a stable
 * default so we never emit a bare `.md`. Shared so the gateway (create) and any
 * future seeder (Theme D anchors) compute the same slug.
 */
export function phaseDocFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'phase-doc'}.md`;
}
