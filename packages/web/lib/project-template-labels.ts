import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDocTemplate } from '@midnite/shared';

/**
 * The project-doc-template i18n seam (Phase 82 Theme D).
 *
 * `PROJECT_DOC_TEMPLATES` in `@midnite/shared` carries each built-in template's
 * `name` + `description` (and its markdown `content`). `shared` is
 * **i18n-agnostic by rule** — the gateway seeds and generates project docs from
 * the same registry — so those strings stay put and stay canonical. The reader-facing
 * name/description are translated **here, at the web call site, by key convention**,
 * with the shared English as the per-key fallback:
 *
 * ```text
 * projects.templates.<templateId>.name
 * projects.templates.<templateId>.description
 * ```
 *
 * This mirrors `lib/workflow-node-labels.ts`, which does the same for the shared
 * node catalogue.
 *
 * **The markdown `content` stays English** — the gateway writes the very same body
 * when it seeds a doc server-side, so translating only the web copy would make a
 * document's language depend on who created it. Documented as a gap in
 * `messages/README.md` alongside the Phaser one.
 *
 * **User-created templates** (the "New template" action) carry a random UUID and no
 * catalog entry, so both resolvers fall through to the stored, user-authored text —
 * which is what should happen: that copy is user data, not product copy.
 */

export type ProjectTemplateLabels = {
  /** Template title (cards, table rows, the "Add document" menu, the editor). */
  name: (template: Pick<ProjectDocTemplate, 'id' | 'name'>) => string;
  /** Template description (cards, table rows). */
  description: (template: Pick<ProjectDocTemplate, 'id' | 'description'>) => string;
};

export function useProjectTemplateLabels(): ProjectTemplateLabels {
  const t = useTranslations('projects');

  return useMemo(() => {
    /** `t(key)` when the catalog has it, else the shared/stored English. */
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    return {
      name: (template) => resolve(`templates.${template.id}.name`, template.name),
      description: (template) => resolve(`templates.${template.id}.description`, template.description),
    };
  }, [t]);
}
