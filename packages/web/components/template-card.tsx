'use client';

import { FileText } from 'lucide-react';
import { ProjectTag } from '@/components/project-tag';
import { useProjectTemplateLabels } from '@/lib/project-template-labels';
import type { Template } from '@/app/(main)/projects/templates';

type Props = {
  template: Template;
  layout: 'list' | 'grid';
  onOpen: () => void;
};

export function TemplateCard({ template, layout, onOpen }: Props) {
  const labels = useProjectTemplateLabels();
  const name = labels.name(template);
  const description = labels.description(template);

  if (layout === 'list') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-lg border border-border/60 surface-glass-interactive p-3 text-left transition-colors hover:border-foreground/20"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ProjectTag tag={template.tag} color={template.color} />
            <span className="truncate text-sm font-medium">{name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        </div>
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-xl border border-border/60 surface-glass-interactive p-4 text-left transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between gap-2">
        <ProjectTag tag={template.tag} color={template.color} />
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <span className="line-clamp-1 text-sm font-medium leading-snug">{name}</span>
      <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}
