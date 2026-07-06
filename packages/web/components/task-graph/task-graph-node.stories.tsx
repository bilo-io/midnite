import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { ReactFlow, ReactFlowProvider, type Node, type NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { TaskGraphNodeData } from '@/lib/task-graph-layout';
import { TaskGraphNode } from './task-graph-node';

const nodeTypes: NodeTypes = { task: TaskGraphNode };

function node(data: TaskGraphNodeData): Node<TaskGraphNodeData> {
  return { id: data.id, type: 'task', position: { x: 40, y: 40 }, data };
}

// Render the custom node inside a minimal read-only ReactFlow so the Handle
// context is present, exactly as the graph view mounts it.
function Canvas({ data }: { data: TaskGraphNodeData }) {
  return (
    <div style={{ width: 340, height: 180 }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={[node(data)]}
          edges={[]}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        />
      </ReactFlowProvider>
    </div>
  );
}

const meta = {
  title: 'Components/TaskGraphNode',
  component: Canvas,
} satisfies Meta<typeof Canvas>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A ready todo task — shows the status + "Ready" chips. */
export const Ready: Story = {
  args: {
    data: {
      id: 't1',
      title: 'Wire the dependency graph endpoint',
      status: 'todo',
      priority: 2,
      ready: true,
      unmetBlockerCount: 0,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Wire the dependency graph endpoint')).toBeVisible();
    await expect(canvas.getByText('Todo')).toBeVisible();
    await expect(canvas.getByText('Ready')).toBeVisible();
    await expect(canvas.getByText('High')).toBeVisible();
  },
};

/** A blocked task — shows "Blocked by N" instead of "Ready". */
export const Blocked: Story = {
  args: {
    data: {
      id: 't2',
      title: 'Render the DAG view',
      status: 'todo',
      priority: 1,
      ready: false,
      unmetBlockerCount: 2,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Blocked by 2')).toBeVisible();
  },
};

/** A foreign blocker pulled in from another project. */
export const Foreign: Story = {
  args: {
    data: {
      id: 't3',
      title: 'Cross-project blocker',
      status: 'wip',
      priority: 0,
      ready: false,
      unmetBlockerCount: 0,
      foreign: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Other project')).toBeVisible();
  },
};
