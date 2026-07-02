import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import type { PrDiff } from '@midnite/shared';

import { PrDiffViewer } from './pr-diff-viewer';

// A faithful mock of the Phase 52 E task-detail page surface: the Details | Review
// tab strip with the Review tab mounting the diff viewer inline (the real page
// fetches the diff; here we pass a fixture so the story is self-contained).
const DIFF: PrDiff = {
  prUrl: 'https://github.com/midnite/midnite/pull/275',
  additions: 9,
  deletions: 2,
  truncated: false,
  hiddenFileCount: 0,
  hiddenFiles: [],
  fetchedAt: '2026-07-02T10:00:00Z',
  files: [
    {
      path: 'packages/web/components/task-detail.tsx',
      status: 'modified',
      additions: 9,
      deletions: 2,
      binary: false,
      hunks: [
        {
          header: '@@ -104,6 +104,11 @@',
          oldStart: 104,
          oldLines: 6,
          newStart: 104,
          newLines: 11,
          lines: [
            { kind: 'context', content: 'export function TaskDetail({ task, variant }: Props) {', oldLine: 104, newLine: 104 },
            { kind: 'add', content: "  const showTabs = variant === 'page' && !!task.prUrl;", newLine: 105 },
            { kind: 'add', content: "  const activeTab = tab === 'review' ? 'review' : 'details';", newLine: 106 },
            { kind: 'del', content: '  return <Details task={task} />;', oldLine: 105 },
            { kind: 'add', content: '  return (', newLine: 107 },
            { kind: 'add', content: '    <Tabs active={activeTab}>{/* Details | Review */}</Tabs>', newLine: 108 },
            { kind: 'add', content: '  );', newLine: 109 },
          ],
        },
      ],
    },
  ],
};

function TabbedReview() {
  const [tab, setTab] = useState<'details' | 'review'>('review');
  const TabButton = ({ id, label }: { id: 'details' | 'review'; label: string }) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={[
        '-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors',
        tab === id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  );
  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex gap-1 border-b border-border/60 px-5" role="tablist" aria-label="Task detail sections">
        <TabButton id="details" label="Details" />
        <TabButton id="review" label="Review" />
      </div>
      {tab === 'review' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <PrDiffViewer diff={DIFF} />
        </div>
      ) : (
        <div className="space-y-3 px-5 py-4 text-sm text-muted-foreground">
          The task’s description, status controls, dependencies, checks and activity live here.
        </div>
      )}
    </div>
  );
}

const meta = {
  title: 'PR Review/Task detail Review tab',
  component: TabbedReview,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TabbedReview>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The Review tab active — the diff viewer embedded inline in the task detail page. */
export const ReviewTab: Story = {};
