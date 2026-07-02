import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { PrDiff } from '@midnite/shared';

import { PrDiffViewer } from './pr-diff-viewer';

const DIFF: PrDiff = {
  prUrl: 'https://github.com/midnite/midnite/pull/271',
  additions: 24,
  deletions: 7,
  truncated: false,
  hiddenFileCount: 0,
  hiddenFiles: [],
  fetchedAt: '2026-07-02T10:00:00Z',
  files: [
    {
      path: 'packages/web/components/pr-review/pr-diff-viewer.tsx',
      status: 'added',
      additions: 14,
      deletions: 0,
      binary: false,
      hunks: [
        {
          header: '@@ -0,0 +1,14 @@',
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 14,
          lines: [
            { kind: 'add', content: "import { useMemo, useState } from 'react';", newLine: 1 },
            { kind: 'add', content: "import type { ViewType } from 'react-diff-view';", newLine: 2 },
            { kind: 'add', content: "import type { PrDiff } from '@midnite/shared';", newLine: 3 },
            { kind: 'add', content: '', newLine: 4 },
            { kind: 'add', content: 'export function PrDiffViewer({ diff }: { diff: PrDiff }) {', newLine: 5 },
            { kind: 'add', content: "  const [viewType, setViewType] = useState<ViewType>('unified');", newLine: 6 },
            { kind: 'add', content: '  const files = useMemo(() => diff.files, [diff.files]);', newLine: 7 },
            { kind: 'add', content: '  return (', newLine: 8 },
            { kind: 'add', content: '    <div className="viewer">', newLine: 9 },
            { kind: 'add', content: '      {/* toolbar + file tree + hunks */}', newLine: 10 },
            { kind: 'add', content: '      {files.length} files changed', newLine: 11 },
            { kind: 'add', content: '    </div>', newLine: 12 },
            { kind: 'add', content: '  );', newLine: 13 },
            { kind: 'add', content: '}', newLine: 14 },
          ],
        },
      ],
    },
    {
      path: 'packages/web/components/task-detail.tsx',
      status: 'modified',
      additions: 8,
      deletions: 3,
      binary: false,
      hunks: [
        {
          header: '@@ -134,7 +134,12 @@ export function TaskDetail() {',
          oldStart: 134,
          oldLines: 7,
          newStart: 134,
          newLines: 12,
          lines: [
            { kind: 'context', content: '  const [prStatus, setPrStatus] = useState(task.prStatus);', oldLine: 134, newLine: 134 },
            { kind: 'add', content: '  const [showDiff, setShowDiff] = useState(false);', newLine: 135 },
            { kind: 'context', content: '', oldLine: 135, newLine: 136 },
            { kind: 'del', content: '  return <PrStatusChip status={prStatus} />;', oldLine: 136 },
            { kind: 'add', content: '  return (', newLine: 137 },
            { kind: 'add', content: '    <button onClick={() => setShowDiff(true)}>View diff</button>', newLine: 138 },
            { kind: 'add', content: '  );', newLine: 139 },
          ],
        },
      ],
    },
    {
      path: 'packages/web/components/pr-review/diff-theme.css',
      status: 'added',
      additions: 2,
      deletions: 0,
      binary: false,
      hunks: [
        {
          header: '@@ -0,0 +1,2 @@',
          oldStart: 0,
          oldLines: 0,
          newStart: 1,
          newLines: 2,
          lines: [
            { kind: 'add', content: '.pr-diff-viewer {', newLine: 1 },
            { kind: 'add', content: '  --diff-text-color: hsl(var(--foreground));', newLine: 2 },
          ],
        },
      ],
    },
    {
      path: 'docs/screenshots/logo.png',
      status: 'added',
      additions: 0,
      deletions: 0,
      binary: true,
      hunks: [],
    },
  ],
};

const meta = {
  title: 'PR Review/PrDiffViewer',
  component: PrDiffViewer,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-[600px] overflow-hidden rounded-lg border border-border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PrDiffViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The default review surface: file tree + the first file expanded (unified). */
export const Default: Story = {
  args: { diff: DIFF },
};

/** Split view with every file expanded — driven through the toolbar controls. */
export const SplitExpanded: Story = {
  args: { diff: DIFF },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('Split view'));
    await userEvent.click(canvas.getByRole('button', { name: /expand all/i }));
    await expect(canvas.getByLabelText('Split view').getAttribute('aria-pressed')).toBe('true');
  },
};

/** A truncated diff surfaces the hidden-file count rather than cutting silently. */
export const Truncated: Story = {
  args: {
    diff: { ...DIFF, truncated: true, hiddenFileCount: 12, hiddenFiles: Array.from({ length: 12 }, (_, i) => `big/file-${i}.ts`) },
  },
};
