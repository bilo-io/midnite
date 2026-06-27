'use client';

import Link from 'next/link';
import { FolderGit2 } from 'lucide-react';
import { getProject } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

/**
 * Chip linking a promoted idea to the project it spawned. Resolves the project
 * name client-side; links to the project modal via the `?open=` deep-link.
 */
export function ProjectChip({ projectId }: { projectId: string }) {
  const { data: project } = useApiData(() => getProject(projectId), [projectId]);
  return (
    <Link
      href={`/projects?open=${projectId}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      <FolderGit2 className="h-3.5 w-3.5 text-muted-foreground" />
      {project?.name ?? 'View project'}
    </Link>
  );
}
