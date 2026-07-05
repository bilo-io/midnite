import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { PrDiff } from '@midnite/shared';
import { PrDiffViewer } from './pr-diff-viewer';
import { fileKey } from './diff-model';

function makeDiff(overrides: Partial<PrDiff> = {}): PrDiff {
  return {
    prUrl: 'https://github.com/org/repo/pull/7',
    additions: 3,
    deletions: 1,
    truncated: false,
    hiddenFileCount: 0,
    hiddenFiles: [],
    fetchedAt: '2026-07-02T10:00:00Z',
    aiReview: null,
    files: [
      {
        path: 'src/app/page.tsx',
        status: 'modified',
        additions: 2,
        deletions: 1,
        binary: false,
        hunks: [
          {
            header: '@@ -1,2 +1,3 @@',
            oldStart: 1,
            oldLines: 2,
            newStart: 1,
            newLines: 3,
            lines: [
              { kind: 'context', content: 'export function Page() {', oldLine: 1, newLine: 1 },
              { kind: 'del', content: '  return null;', oldLine: 2 },
              { kind: 'add', content: '  const x = 1;', newLine: 2 },
              { kind: 'add', content: '  return <div>{x}</div>;', newLine: 3 },
            ],
          },
        ],
      },
      {
        path: 'README.md',
        status: 'added',
        additions: 1,
        deletions: 0,
        binary: false,
        hunks: [
          {
            header: '@@ -0,0 +1 @@',
            oldStart: 0,
            oldLines: 0,
            newStart: 1,
            newLines: 1,
            lines: [{ kind: 'add', content: '# Hello', newLine: 1 }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('PrDiffViewer', () => {
  it('summarises the file count and totals', () => {
    render(<PrDiffViewer diff={makeDiff()} />);
    expect(screen.getByText(/files changed/i)).toBeTruthy();
    expect(screen.getByText('+3')).toBeTruthy();
  });

  it('defaults to unified and toggles to split, persisting the choice', () => {
    render(<PrDiffViewer diff={makeDiff()} />);

    expect(screen.getByLabelText('Unified view').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByLabelText('Split view'));
    expect(screen.getByLabelText('Split view').getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem('midnite:pr-diff-view-type')).toContain('split');
  });

  it('expands all files then collapses them', () => {
    render(<PrDiffViewer diff={makeDiff()} />);
    // Assert on each file section's expanded state (syntax highlighting fragments
    // the inner code across token spans, so matching on line text is brittle). The
    // section's header button is scoped by the file's DOM id to avoid the identically
    // named file-tree buttons.
    const expanded = (path: string): string | null => {
      const el = document.getElementById(fileKey({ path } as PrDiff['files'][number]));
      if (!el) throw new Error(`no section for ${path}`);
      return within(el).getAllByRole('button')[0]!.getAttribute('aria-expanded');
    };

    // Only the first file is open initially.
    expect(expanded('src/app/page.tsx')).toBe('true');
    expect(expanded('README.md')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(expanded('README.md')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(expanded('src/app/page.tsx')).toBe('false');
    expect(expanded('README.md')).toBe('false');
  });

  it('renders the AI-review banner from diff.aiReview (Phase 52 D)', () => {
    render(
      <PrDiffViewer
        diff={makeDiff({
          aiReview: { verdict: 'changes-requested', summary: 'Memoise the tokenize call.', reviewedAt: '2026-07-05T00:00:00Z' },
        })}
      />,
    );
    expect(screen.getByText(/changes requested/i)).toBeTruthy();
    expect(screen.getByText(/memoise the tokenize call/i)).toBeTruthy();
  });

  it('surfaces hidden files when the diff is truncated', () => {
    render(
      <PrDiffViewer
        diff={makeDiff({ truncated: true, hiddenFileCount: 4, hiddenFiles: ['a', 'b', 'c', 'd'] })}
      />,
    );
    expect(screen.getByText(/4 files not shown/i)).toBeTruthy();
  });

  it('toggles the file rail between tree and flat list', () => {
    const { container } = render(<PrDiffViewer diff={makeDiff()} />);
    const rail = container.querySelector('aside');
    if (!rail) throw new Error('expected the file rail');

    const layout = screen.getByRole('group', { name: /file list layout/i });
    expect(within(layout).getByLabelText('Tree view').getAttribute('aria-pressed')).toBe('true');
    // Tree mode shows the leaf filename, not the full path.
    expect(within(rail).getByText('page.tsx')).toBeTruthy();

    fireEvent.click(within(layout).getByLabelText('Flat list view'));
    expect(within(layout).getByLabelText('Flat list view').getAttribute('aria-pressed')).toBe('true');
    // Flat list shows the full path in one row.
    expect(within(rail).getByText('src/app/page.tsx')).toBeTruthy();
  });
});
