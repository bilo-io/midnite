/**
 * Built-in document templates surfaced on the Projects page under the "Templates"
 * tab. The list itself now lives in `@midnite/shared` (`PROJECT_DOC_TEMPLATES`) so
 * the gateway can also seed/generate project docs from it — this module just
 * re-exports it under the names the rest of `web` already imports, plus the
 * client-only "New Template" helper (a working copy for the editor, never sent
 * to the gateway; the Templates tab's own persistence is separate, localStorage
 * client-side).
 */
import { PROJECT_DOC_TEMPLATES, type ProjectDocTemplate } from '@midnite/shared';

export type Template = ProjectDocTemplate;

export const TEMPLATES: Template[] = PROJECT_DOC_TEMPLATES;

/** A fresh, empty template for the "New Template" action. */
export function createBlankTemplate(): Template {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled template',
    tag: 'DOC',
    color: '#6366f1',
    description: '',
    content: '# Untitled\n\n',
  };
}
