'use client';

import { Folder, ListChecks } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/export-menu';
import { ProjectProgressBar } from '@/components/project-progress';
import { ProjectStatusBadge } from '@/components/project-status-badge';
import { ProjectTag } from '@/components/project-tag';
import { SelectableIcon } from '@/components/selectable-icon';
import { SourceIcon } from '@/components/source-icon';
import { exportProjectMarkdown } from '@/lib/api';
import { cn } from '@/lib/utils';

type Props = {
  project: Project;
  layout: 'list' | 'grid';
  onOpen: () => void;
  onPlan: () => void;
  selected?: boolean;
  onToggleSelect?: (shiftKey: boolean) => void;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export function ProjectCard({ project, layout, onOpen, onPlan, selected = false, onToggleSelect }: Props) {
  const tasks = project.taskCount ?? 0;
  const sourceCount = project.sources.length;
  const exportFilename = (project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

  const selectIcon = (
    <SelectableIcon Icon={Folder} selected={selected} onToggle={(sk) => onToggleSelect?.(sk)} />
  );

  const archivedBadge = project.archived ? (
    <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      Archived
    </span>
  ) : null;

  const planButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onPlan();
      }}
    >
      <ListChecks className="h-4 w-4" />
      {project.plan ? 'Plan' : 'Draft plan'}
    </Button>
  );

  const exportMenu = (
    <div onClick={(e) => e.stopPropagation()}>
      <ExportMenu
        fetchMarkdown={() => exportProjectMarkdown(project.id)}
        filename={exportFilename}
        title={project.name}
      />
    </div>
  );

  const favicons =
    sourceCount > 0 ? (
      <div className="flex items-center -space-x-1">
        {project.sources.slice(0, 5).map((s) => (
          <span
            key={s.id}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-border/60 bg-background"
          >
            <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} className="h-3 w-3" />
          </span>
        ))}
      </div>
    ) : null;

  if (layout === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40',
          selected && 'border-primary/50 bg-accent/30',
          project.archived && 'opacity-60',
        )}
      >
        {selectIcon}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <ProjectTag tag={project.tag} color={project.color} />
            <ProjectStatusBadge project={project} />
            {archivedBadge}
            <span className="truncate text-sm font-medium">{project.name}</span>
          </div>
          {project.description ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{project.description}</p>
          ) : null}
        </button>
        {favicons}
        <ProjectProgressBar project={project} hideLabel className="hidden w-24 shrink-0 md:flex" />
        <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
          {plural(tasks, 'task')}
        </span>
        {exportMenu}
        {planButton}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-foreground/20 hover:bg-accent/40',
        selected && 'border-primary/50 bg-accent/30',
        project.archived && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {selectIcon}
          <ProjectTag tag={project.tag} color={project.color} />
          <ProjectStatusBadge project={project} />
          {archivedBadge}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {plural(tasks, 'task')}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="flex flex-col gap-2 text-left">
        <span className="line-clamp-1 text-sm font-medium leading-snug">{project.name}</span>
        {project.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
        ) : (
          <p className="text-xs italic text-muted-foreground">No description</p>
        )}
      </button>
      <ProjectProgressBar project={project} />
      <div className="mt-auto flex items-center justify-between gap-2">
        {favicons ?? (
          <span className="text-xs text-muted-foreground">{plural(0, 'source')}</span>
        )}
        <div className="flex items-center gap-1">
          {exportMenu}
          {planButton}
        </div>
      </div>
    </div>
  );
}
