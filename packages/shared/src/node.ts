import { z } from 'zod';

// A node's position on the editor canvas.
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// A node in a workflow graph. `type` is a NodeTypeDefinition id (see node-types.ts);
// `params` is validated per-type by that definition's paramsSchema — kept generic here
// so the graph schema stays stable as new node types are added.
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string().max(120).optional(),
  position: PositionSchema,
  credentialId: z.string().optional(),
  params: z.record(z.unknown()).default({}),
});

// A directed connection between two node ports. Most nodes use the default 'main' port;
// logic nodes (e.g. If) expose multiple named output ports.
export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourcePort: z.string().default('main'),
  target: z.string(),
  targetPort: z.string().default('main'),
});

export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
});

export type Position = z.infer<typeof PositionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;
