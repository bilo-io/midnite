import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';

const meta = {
  title: 'Primitives/Card',
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A composed card: header with an uppercase title, then content. */
export const Composed: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Agent pool</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Three of four slots are busy. The scheduler will dispatch the next queued task as soon as a slot frees up.</p>
        <Button size="sm" variant="outline">
          View slots
        </Button>
      </CardContent>
    </Card>
  ),
};

/** The bare surface — just the bordered, shadowed container. */
export const Surface: Story = {
  render: () => <Card className="max-w-sm p-6 text-sm">A plain card surface.</Card>,
};
