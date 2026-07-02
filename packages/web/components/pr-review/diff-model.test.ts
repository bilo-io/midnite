import { describe, expect, it } from 'vitest';
import type { PrDiffFile } from '@midnite/shared';
import { buildFileTree, fileKey, mapDiffFiles } from './diff-model';

function file(overrides: Partial<PrDiffFile> = {}): PrDiffFile {
  return {
    path: 'src/foo.ts',
    status: 'modified',
    additions: 1,
    deletions: 1,
    binary: false,
    hunks: [
      {
        header: '@@ -1,2 +1,2 @@',
        oldStart: 1,
        oldLines: 2,
        newStart: 1,
        newLines: 2,
        lines: [
          { kind: 'context', content: 'const a = 1;', oldLine: 1, newLine: 1 },
          { kind: 'del', content: 'const b = 2;', oldLine: 2 },
          { kind: 'add', content: 'const b = 3;', newLine: 2 },
        ],
      },
    ],
    ...overrides,
  };
}

function firstOf(files: PrDiffFile[]) {
  const [mapped] = mapDiffFiles(files);
  if (!mapped) throw new Error('expected a mapped file');
  return mapped;
}

describe('mapDiffFiles', () => {
  it('maps each line kind to the react-diff-view change model with correct line numbers', () => {
    const mapped = firstOf([file()]);
    const changes = mapped.hunks[0]!.changes;

    expect(changes[0]).toMatchObject({ type: 'normal', isNormal: true, oldLineNumber: 1, newLineNumber: 1 });
    expect(changes[1]).toMatchObject({ type: 'delete', isDelete: true, lineNumber: 2 });
    expect(changes[2]).toMatchObject({ type: 'insert', isInsert: true, lineNumber: 2 });
    // content stays marker-free (matches gitdiff-parser's model).
    expect(changes[1]!.content).toBe('const b = 2;');
  });

  it('derives the diffType from the file status', () => {
    expect(firstOf([file({ status: 'added' })]).diffType).toBe('add');
    expect(firstOf([file({ status: 'removed' })]).diffType).toBe('delete');
    expect(firstOf([file({ status: 'modified' })]).diffType).toBe('modify');
    expect(firstOf([file({ status: 'renamed' })]).diffType).toBe('rename');
  });

  it('preserves hunk range headers verbatim', () => {
    expect(firstOf([file()]).hunks[0]!.content).toBe('@@ -1,2 +1,2 @@');
  });
});

describe('fileKey', () => {
  it('produces a DOM-id-safe, path-derived key', () => {
    expect(fileKey(file({ path: 'src/a/b.ts' }))).toBe('diff-file-src-a-b-ts');
  });
});

describe('buildFileTree', () => {
  it('nests files under their directory segments', () => {
    const tree = buildFileTree([
      file({ path: 'src/a.ts' }),
      file({ path: 'src/nested/b.ts' }),
      file({ path: 'README.md' }),
    ]);

    // Directories sort before files: src/ then README.md.
    expect(tree.map((n) => n.name)).toEqual(['src', 'README.md']);

    const src = tree[0];
    if (!src || src.kind !== 'dir') throw new Error('expected src dir');
    // Within src: the `nested` dir before the `a.ts` file.
    expect(src.children.map((n) => `${n.kind}:${n.name}`)).toEqual(['dir:nested', 'file:a.ts']);

    const nested = src.children[0];
    if (!nested || nested.kind !== 'dir') throw new Error('expected nested dir');
    expect(nested.children[0]).toMatchObject({ kind: 'file', name: 'b.ts' });
  });

  it('keeps a root-level file as a single node', () => {
    const tree = buildFileTree([file({ path: 'top.ts' })]);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({ kind: 'file', path: 'top.ts' });
  });
});
