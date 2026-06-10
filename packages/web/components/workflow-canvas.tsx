'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, type DragEvent } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from '@xyflow/react';
import { WorkflowNodeView } from '@/components/nodes/workflow-node-view';
import { NODE_DRAG_MIME } from '@/lib/workflow-node-catalog';
import { useWorkflowStore } from '@/lib/workflow-store';

// All three categories render through one view; differences (icon, hue, ports) come
// from the shared node-type definition.
const nodeTypes: NodeTypes = {
  trigger: WorkflowNodeView,
  action: WorkflowNodeView,
  logic: WorkflowNodeView,
};

export default function WorkflowCanvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange);
  const onConnect = useWorkflowStore((s) => s.onConnect);
  const addNode = useWorkflowStore((s) => s.addNode);
  const select = useWorkflowStore((s) => s.select);
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(NODE_DRAG_MIME);
      if (!kind) return;
      // Drop where the cursor is, translated from screen space into flow coordinates.
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(kind, position);
    },
    [screenToFlowPosition, addNode],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, node) => select(node.id)}
      onPaneClick={() => select(null)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      fitView
      minZoom={0.2}
      defaultEdgeOptions={{ animated: true }}
    >
      <Background gap={16} size={1} />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}
