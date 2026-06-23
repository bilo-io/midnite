import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import type { ExpressionContext } from '@midnite/shared';

import { ExpressionField } from './expression-editor';

// A populated design-time context: the node's own input as `$json`, plus two
// upstream nodes' outputs under `$node` — what the editor draws autocomplete,
// the data picker, and the resolved preview from.
const context: ExpressionContext = {
  $json: { body: { title: 'Fix login bug', number: 42, labels: ['p1', 'auth'] } },
  $node: {
    'Fetch issue': { json: { status: 200, body: { title: 'Fix login bug', author: 'octocat' } } },
    'Manual trigger': { json: { ref: 'PR-42' } },
  },
  $env: {},
};

// ExpressionField is controlled; wrap it with local state so stories are interactive.
function Demo({ initial, hasData = true }: { initial: string; hasData?: boolean }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="w-80 rounded-lg border border-border/60 bg-background/40 p-4">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">URL</label>
      <ExpressionField
        value={value}
        onChange={setValue}
        fieldLabel="URL"
        context={hasData ? context : { $json: undefined, $node: {}, $env: {} }}
        hasData={hasData}
      />
    </div>
  );
}

const meta = {
  title: 'Components/ExpressionField',
  component: ExpressionField,
  parameters: { layout: 'centered' },
  // Each story drives the component through the stateful <Demo> wrapper, so these
  // satisfy the required-prop types without being used directly.
  args: {
    value: '',
    onChange: () => {},
    fieldLabel: 'URL',
    context: { $json: undefined, $node: {}, $env: {} },
    hasData: false,
  },
} satisfies Meta<typeof ExpressionField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mixed text + two references; the preview resolves them against the last run. */
export const Populated: Story = {
  render: () => (
    <Demo initial={'Issue #{{ $json.body.number }}: {{ $node["Fetch issue"].json.body.title }}'} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Issue #42: Fix login bug')).toBeInTheDocument();
  },
};

/** The data picker open: an explorable tree of the last run's data; clicking a
 *  leaf inserts its `{{…}}` reference. */
export const DataPicker: Story = {
  render: () => <Demo initial="" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('Toggle data picker for URL'));
    // The upstream node is explorable by label; its root inserts a reference.
    await userEvent.click(canvas.getByTitle('Insert $node["Fetch issue"]'));
    await expect(canvas.getByLabelText('URL expression')).toHaveValue('{{ $node["Fetch issue"] }}');
  },
};

/** A single typed reference, showing the resolved value beneath the input. */
export const SingleReference: Story = {
  render: () => <Demo initial={'{{ $node["Fetch issue"].json.body.author }}'} />,
};

/** Mid-type: a partial path; focusing the input reveals key suggestions. */
export const Autocompleting: Story = {
  render: () => <Demo initial="{{ $json." />,
};

/** Before any run: no data to preview, so the editor falls back to a hint. */
export const NoRunData: Story = {
  render: () => <Demo initial="{{ $json.id }}" hasData={false} />,
};
