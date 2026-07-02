import type { PrDiffFile, PrDiffFileStatus, PrDiffHunk } from '@midnite/shared';
import type { ChangeData, DiffType, HunkData } from 'react-diff-view';

// Bridge the gateway's structured PrDiff (already parsed, marker-free lines) to
// react-diff-view's `gitdiff-parser` data model so we can reuse its split/unified
// renderer + comment-widget infra without re-parsing a raw blob. The shapes line
// up 1:1 — this is a pure field re-map (see phase-52 Decision §3).

/** react-diff-view keys files by change kind; our statuses map directly. */
const STATUS_TO_DIFF_TYPE: Record<PrDiffFileStatus, DiffType> = {
  added: 'add',
  removed: 'delete',
  modified: 'modify',
  renamed: 'rename',
};

function toChanges(hunk: PrDiffHunk): ChangeData[] {
  return hunk.lines.map((line): ChangeData => {
    if (line.kind === 'add') {
      // An insert numbers by the new file only.
      return {
        type: 'insert',
        isInsert: true,
        content: line.content,
        lineNumber: line.newLine ?? 0,
      };
    }
    if (line.kind === 'del') {
      // A delete numbers by the old file only.
      return {
        type: 'delete',
        isDelete: true,
        content: line.content,
        lineNumber: line.oldLine ?? 0,
      };
    }
    return {
      type: 'normal',
      isNormal: true,
      content: line.content,
      oldLineNumber: line.oldLine ?? 0,
      newLineNumber: line.newLine ?? 0,
    };
  });
}

function toHunks(file: PrDiffFile): HunkData[] {
  return file.hunks.map((hunk) => ({
    content: hunk.header,
    oldStart: hunk.oldStart,
    oldLines: hunk.oldLines,
    newStart: hunk.newStart,
    newLines: hunk.newLines,
    changes: toChanges(hunk),
  }));
}

export type MappedDiffFile = {
  /** Stable key for React + the file-tree jump target (the anchor id). */
  key: string;
  file: PrDiffFile;
  diffType: DiffType;
  hunks: HunkData[];
};

/** A stable, DOM-id-safe key for a file (path is unique within a diff). */
export function fileKey(file: PrDiffFile): string {
  return `diff-file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`;
}

/** Map every file's hunks to react-diff-view's model, preserving order. */
export function mapDiffFiles(files: PrDiffFile[]): MappedDiffFile[] {
  return files.map((file) => ({
    key: fileKey(file),
    file,
    diffType: STATUS_TO_DIFF_TYPE[file.status],
    hunks: toHunks(file),
  }));
}

// --- File tree (nested-directory view) ---

export type TreeNode =
  | { kind: 'dir'; name: string; path: string; children: TreeNode[] }
  | { kind: 'file'; name: string; path: string; file: PrDiffFile };

/**
 * Build a nested directory tree from the flat file list. Single-child directory
 * chains stay separate nodes (no path-collapsing) so the tree mirrors the repo
 * layout; callers can auto-expand as they like.
 */
export function buildFileTree(files: PrDiffFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const segments = file.path.split('/');
    let level = root;
    let prefix = '';

    segments.forEach((segment, i) => {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      const isLeaf = i === segments.length - 1;

      if (isLeaf) {
        level.push({ kind: 'file', name: segment, path: file.path, file });
        return;
      }

      let dir = level.find(
        (node): node is Extract<TreeNode, { kind: 'dir' }> =>
          node.kind === 'dir' && node.name === segment,
      );
      if (!dir) {
        dir = { kind: 'dir', name: segment, path: prefix, children: [] };
        level.push(dir);
      }
      level = dir.children;
    });
  }

  // Directories first, then files, each alphabetical — a conventional tree order.
  const sortLevel = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.kind === 'dir') sortLevel(node.children);
    }
    return nodes;
  };

  return sortLevel(root);
}
