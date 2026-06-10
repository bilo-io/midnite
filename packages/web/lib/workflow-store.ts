'use client';

import { createContext, useContext } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import {
  getNodeTypeDefinition,
  type NodeRunStatus,
  type Trigger,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
} from '@midnite/shared';

export interface WorkflowNodeData extends Record<string, unknown> {
  kind: string;
  label: string;
  params: Record<string, unknown>;
  status?: NodeRunStatus;
}

export type AppNode = Node<WorkflowNodeData>;

export interface WorkflowGraphPayload {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowState {
  name: string;
  enabled: boolean;
  trigger: Trigger;
  nodes: AppNode[];
  edges: Edge[];
  selectedId: string | null;
  dirty: boolean;
  setName(name: string): void;
  setEnabled(enabled: boolean): void;
  setTrigger(trigger: Trigger): void;
  onNodesChange(changes: NodeChange<AppNode>[]): void;
  onEdgesChange(changes: EdgeChange[]): void;
  onConnect(connection: Connection): void;
  addNode(kind: string, position?: { x: number; y: number }): void;
  updateNodeParams(id: string, params: Record<string, unknown>): void;
  removeNode(id: string): void;
  select(id: string | null): void;
  applyRunStatuses(map: Record<string, NodeRunStatus>): void;
  markSaved(): void;
  toGraph(): WorkflowGraphPayload;
}

function categoryOf(kind: string): string {
  return getNodeTypeDefinition(kind)?.category ?? 'action';
}

function toAppNodes(workflow: Workflow): AppNode[] {
  return workflow.nodes.map((n) => {
    const def = getNodeTypeDefinition(n.type);
    return {
      id: n.id,
      type: categoryOf(n.type),
      position: n.position,
      data: { kind: n.type, label: n.label ?? def?.title ?? n.type, params: n.params ?? {} },
    };
  });
}

function toAppEdges(workflow: Workflow): Edge[] {
  return workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourcePort,
    targetHandle: e.targetPort,
  }));
}

export function createWorkflowStore(workflow: Workflow): StoreApi<WorkflowState> {
  return createStore<WorkflowState>((set, get) => ({
    name: workflow.name,
    enabled: workflow.enabled,
    trigger: workflow.trigger,
    nodes: toAppNodes(workflow),
    edges: toAppEdges(workflow),
    selectedId: null,
    dirty: false,

    setName: (name) => set({ name, dirty: true }),
    setEnabled: (enabled) => set({ enabled, dirty: true }),

    // workflow.trigger is canonical — keep the single trigger node's kind in lockstep.
    setTrigger: (trigger) =>
      set((s) => ({
        trigger,
        dirty: true,
        nodes: s.nodes.map((n) =>
          n.data.kind.startsWith('trigger.')
            ? { ...n, type: 'trigger', data: { ...n.data, kind: `trigger.${trigger.type}` } }
            : n,
        ),
      })),

    onNodesChange: (changes) =>
      set((s) => ({
        nodes: applyNodeChanges(changes, s.nodes),
        dirty: s.dirty || changes.some((c) => c.type !== 'select' && c.type !== 'dimensions'),
      })),

    onEdgesChange: (changes) =>
      set((s) => ({
        edges: applyEdgeChanges(changes, s.edges),
        dirty: s.dirty || changes.some((c) => c.type !== 'select'),
      })),

    onConnect: (connection) => set((s) => ({ edges: addEdge(connection, s.edges), dirty: true })),

    addNode: (kind, position) => {
      const def = getNodeTypeDefinition(kind);
      if (!def) return;
      const id = crypto.randomUUID();
      const count = get().nodes.length;
      // Drop position when dragged from the palette; a cascading fallback when clicked.
      const at = position ?? { x: 440, y: 80 + count * 90 };
      const node: AppNode = {
        id,
        type: def.category,
        position: at,
        data: { kind, label: def.title, params: {} },
      };
      set((s) => ({ nodes: [...s.nodes, node], selectedId: id, dirty: true }));
    },

    updateNodeParams: (id, params) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, params } } : n)),
        dirty: true,
      })),

    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
      })),

    select: (id) => set({ selectedId: id }),

    applyRunStatuses: (map) =>
      set((s) => ({
        nodes: s.nodes.map((n) => ({ ...n, data: { ...n.data, status: map[n.id] } })),
      })),

    markSaved: () => set({ dirty: false }),

    toGraph: () => {
      const { nodes, edges } = get();
      return {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.kind,
          label: n.data.label,
          position: n.position,
          params: n.data.params,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          sourcePort: e.sourceHandle ?? 'main',
          target: e.target,
          targetPort: e.targetHandle ?? 'main',
        })),
      };
    },
  }));
}

export const WorkflowStoreContext = createContext<StoreApi<WorkflowState> | null>(null);

export function useWorkflowStore<T>(selector: (state: WorkflowState) => T): T {
  const store = useContext(WorkflowStoreContext);
  if (!store) throw new Error('useWorkflowStore must be used within a WorkflowStoreContext');
  return useStore(store, selector);
}
