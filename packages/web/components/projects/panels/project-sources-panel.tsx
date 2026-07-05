'use client';

import { MAX_SOURCES_PER_PROJECT, type Project } from '@midnite/shared';
import { addProjectSource, removeProjectSource, reorderProjectSources } from '@/lib/api';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { useConfirm } from '@/components/confirm-dialog';

type Props = {
  project: Project;
  /** Bubble the re-hydrated project after an add/remove/reorder. */
  onChange: (project: Project) => void;
};

/**
 * A project's sources (Phase 55 B) — live add / remove / reorder against an
 * existing project, extracted from the modal so the modal + detail page share it.
 * (Create mode's staged-URL variant stays inline in the modal.) The
 * SourceListEditor surfaces its own add/reorder errors.
 */
export function ProjectSourcesPanel({ project, onChange }: Props) {
  const confirm = useConfirm();

  const add = async (url: string) => onChange(await addProjectSource(project.id, url));

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will be detached from this project.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    onChange(await removeProjectSource(project.id, id));
  };

  const reorder = async (ids: string[]) => {
    onChange({ ...project, sources: orderByIds(project.sources, ids) }); // optimistic
    try {
      onChange(await reorderProjectSources(project.id, ids));
    } catch (e) {
      onChange(project); // roll back
      throw e;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Sources</span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {project.sources.length}/{MAX_SOURCES_PER_PROJECT}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Reference links for this project — drag the grip to reorder. Included when drafting a plan.
      </p>
      <SourceListEditor
        sources={project.sources}
        max={MAX_SOURCES_PER_PROJECT}
        placeholder="Paste a Google Docs, Notion, or YouTube link"
        onAdd={add}
        onRemove={remove}
        onReorder={reorder}
      />
    </div>
  );
}
