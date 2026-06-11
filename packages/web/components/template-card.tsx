'use client';

import { FileText } from 'lucide-react';
import { ProjectTag } from '@/components/project-tag';
import type { Template } from '@/app/(main)/projects/templates';

type Props = {
  template: Template;
  layout: 'list' | 'grid';
  onOpen: () => void;
};

export function TemplateCard({ template, layout, onOpen }: Props) {
  if (layout === 'list') {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ProjectTag tag={template.tag} color={template.color} />
            <span className="truncate text-sm font-medium">{template.name}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{template.description}</p>
        </div>
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <ProjectTag tag={template.tag} color={template.color} />
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground/60" />
      </div>
      <span className="line-clamp-1 text-sm font-medium leading-snug">{template.name}</span>
      <p className="line-clamp-2 text-xs text-muted-foreground">{template.description}</p>
    </button>
  );
}
