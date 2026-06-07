'use client';

import '@xyflow/react/dist/style.css';
import { Background, Controls, MiniMap, ReactFlow, type NodeTypes } from '@xyflow/react';
import { WorkflowNodeView } from '@/components/nodes/workflow-node-view';
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
  const select = useWorkflowStore((s) => s.select);

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
