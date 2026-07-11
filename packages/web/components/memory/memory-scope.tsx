'use client';

import { Brain } from 'lucide-react';
import type { Project } from '@midnite/shared';
import { ProjectTag } from '@/components/project-tag';
import { Select, type SelectOption } from '@/components/ui/select';

/**
 * The memory scope chip: a project's coloured tag, or a violet "Global" pill for
 * project-less (shared) memories. Shared by the memory list cards and the
 * workspace header so the two never drift.
 */
export function MemoryScopeChip({ project }: { project?: Project }) {
  if (project) return <ProjectTag tag={project.tag} color={project.color} />;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-[hsl(262_83%_66%/0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(262_83%_72%)]">
      <Brain className="h-3 w-3" />
      Global
    </span>
  );
}

// The scope select needs a string value; 'global' stands in for projectId null.
// Shared by the create modal and the workspace doc panel so the two never drift.
export const GLOBAL = 'global';

/** A projectId (or null for global) → the scope select's string value. */
export function scopeValue(projectId: string | null | undefined): string {
  return projectId ?? GLOBAL;
}

/** The scope select's string value → a projectId (or null for global). */
export function scopeToProjectId(scope: string): string | null {
  return scope === GLOBAL ? null : scope;
}

export function buildScopeOptions(projects: Project[]): SelectOption<string>[] {
  return [
    {
      value: GLOBAL,
      label: 'Global — every project',
      icon: <Brain className="h-4 w-4 text-[hsl(262_83%_66%)]" />,
    },
    ...projects.map((p) => ({
      value: p.id,
      label: p.name,
      icon: (
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: p.color }}
        />
      ),
    })),
  ];
}

/** The scope picker (Global vs a project) shared across memory surfaces. */
export function MemoryScopeSelect({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <Select
      options={buildScopeOptions(projects)}
      value={value}
      onChange={onChange}
      aria-label="Memory scope"
    />
  );
}
