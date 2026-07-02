'use client';

import { useMemo, useState } from 'react';
import { ChevronRight, FileText, FolderClosed, ListTree, Rows3 } from 'lucide-react';
import type { PrDiffFile } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { buildFileTree, fileKey, type TreeNode } from './diff-model';

export type FileTreeMode = 'tree' | 'list';

function FileCounts({ file }: { file: PrDiffFile }) {
  return (
    <span className="ml-auto shrink-0 pl-2 font-mono text-[10px] tabular-nums">
      {file.additions > 0 ? <span className="text-success">+{file.additions}</span> : null}
      {file.additions > 0 && file.deletions > 0 ? ' ' : null}
      {file.deletions > 0 ? <span className="text-destructive-foreground">−{file.deletions}</span> : null}
    </span>
  );
}

function TreeRow({ node, depth, onJump }: { node: TreeNode; depth: number; onJump: (path: string) => void }) {
  const [open, setOpen] = useState(true);
  const pad = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.kind === 'dir') {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={pad}
          className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-xs text-muted-foreground hover:bg-muted/60"
        >
          <ChevronRight className={cn('h-3 w-3 shrink-0 transition-transform', open && 'rotate-90')} />
          <FolderClosed className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {open ? (
          <ul>
            {node.children.map((child) => (
              <TreeRow key={child.path} node={child} depth={depth + 1} onJump={onJump} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onJump(node.path)}
        style={pad}
        className="flex w-full items-center gap-1.5 py-1 pr-2 text-left text-xs hover:bg-muted/60"
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        <FileCounts file={node.file} />
      </button>
    </li>
  );
}

type Props = {
  files: PrDiffFile[];
  hiddenFiles: string[];
  /** Scroll the matching DiffFile into view. */
  onJump: (path: string) => void;
};

/** Left rail listing every changed file — toggles between a nested tree and a flat list. */
export function DiffFileTree({ files, hiddenFiles, onJump }: Props) {
  const [mode, setMode] = useState<FileTreeMode>('tree');
  const tree = useMemo(() => buildFileTree(files), [files]);

  const jump = (path: string) => {
    const el = document.getElementById(fileKey({ path } as PrDiffFile));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onJump(path);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-2 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {files.length} file{files.length === 1 ? '' : 's'}
        </span>
        <div className="flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5" role="group" aria-label="File list layout">
          <button
            type="button"
            onClick={() => setMode('tree')}
            aria-pressed={mode === 'tree'}
            aria-label="Tree view"
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:text-foreground',
              mode === 'tree' && 'bg-background text-foreground shadow-sm',
            )}
          >
            <ListTree className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode('list')}
            aria-pressed={mode === 'list'}
            aria-label="Flat list view"
            className={cn(
              'rounded p-1 text-muted-foreground transition-colors hover:text-foreground',
              mode === 'list' && 'bg-background text-foreground shadow-sm',
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {mode === 'tree' ? (
          <ul>
            {tree.map((node) => (
              <TreeRow key={node.path} node={node} depth={0} onJump={jump} />
            ))}
          </ul>
        ) : (
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => jump(file.path)}
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs hover:bg-muted/60"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate" title={file.path}>
                    {file.path}
                  </span>
                  <FileCounts file={file} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {hiddenFiles.length > 0 ? (
          <p className="mt-2 border-t border-border/60 px-2 pt-2 text-[11px] text-amber-600 dark:text-amber-400">
            {hiddenFiles.length} file{hiddenFiles.length === 1 ? '' : 's'} hidden (diff truncated)
          </p>
        ) : null}
      </div>
    </div>
  );
}
