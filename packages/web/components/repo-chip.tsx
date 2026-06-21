import { FolderGit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A subtle chip showing the repo a task targets (`task.repo`). Deliberately
 * monochrome — distinct from the colored project tag, since repo and project are
 * orthogonal axes. Render only when a task has a repo assigned.
 */
export function RepoChip({ repo, className }: { repo: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground',
        className,
      )}
      title={repo}
    >
      <FolderGit2 aria-hidden className="h-3 w-3 shrink-0" />
      <span className="truncate">{repo}</span>
    </span>
  );
}
