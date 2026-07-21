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
  type NodeRun,
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
  /** Failure message from the latest run (e.g. an `ExpressionError`), surfaced
   *  inline on the node so a bad `{{expr}}` reference is obvious on the canvas. */
  error?: string;
}

export type AppNode = Node<WorkflowNodeData>;

export interface WorkflowGraphPayload {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowState {
  name: string;
  description: string;
  enabled: boolean;
  trigger: Trigger;
  nodes: AppNode[];
  edges: Edge[];
  selectedId: string | null;
  dirty: boolean;
  /** Monotonic edit counter, bumped on every content edit. Lets a save started
   *  at revision R clear `dirty` only if no edit landed during its round-trip
   *  (see `markSaved`), so an edit mid-save isn't silently marked saved. */
  revision: number;
  setName(name: string): void;
  setDescription(description: string): void;
  setEnabled(enabled: boolean): void;
  setTrigger(trigger: Trigger): void;
  onNodesChange(changes: NodeChange<AppNode>[]): void;
  onEdgesChange(changes: EdgeChange[]): void;
  onConnect(connection: Connection): void;
  addNode(kind: string, position?: { x: number; y: number }): void;
  updateNodeParams(id: string, params: Record<string, unknown>): void;
  /** Rename a node, keeping labels unique (expressions reference nodes by label,
   *  so a collision would be ambiguous) — a clashing name is auto-suffixed. */
  setLabel(id: string, label: string): void;
  removeNode(id: string): void;
  select(id: string | null): void;
  applyRunState(runs: NodeRun[]): void;
  markSaved(atRevision?: number): void;
  toGraph(): WorkflowGraphPayload;
}

function categoryOf(kind: string): string {
  return getNodeTypeDefinition(kind)?.category ?? 'action';
}

/**
 * A label unique among `taken`, suffixing " 2", " 3", … on collision (e.g. a
 * second "HTTP Request" becomes "HTTP Request 2"). Node labels must be unique
 * because expressions reference upstream nodes by label. A blank desired label
 * falls back to `fallback`.
 */
export function uniqueLabel(desired: string, taken: Iterable<string>, fallback = 'Node'): string {
  const used = new Set(taken);
  const base = desired.trim() || fallback;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
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
    description: workflow.description ?? '',
    enabled: workflow.enabled,
    trigger: workflow.trigger,
    nodes: toAppNodes(workflow),
    edges: toAppEdges(workflow),
    selectedId: null,
    dirty: false,
    revision: 0,

    setName: (name) => set((s) => ({ name, dirty: true, revision: s.revision + 1 })),
    setDescription: (description) => set((s) => ({ description, dirty: true, revision: s.revision + 1 })),
    setEnabled: (enabled) => set((s) => ({ enabled, dirty: true, revision: s.revision + 1 })),

    // workflow.trigger is canonical — keep the single trigger node's kind in lockstep.
    setTrigger: (trigger) =>
      set((s) => ({
        trigger,
        dirty: true,
        revision: s.revision + 1,
        nodes: s.nodes.map((n) =>
          n.data.kind.startsWith('trigger.')
            ? { ...n, type: 'trigger', data: { ...n.data, kind: `trigger.${trigger.type}` } }
            : n,
        ),
      })),

    onNodesChange: (changes) =>
      set((s) => {
        const edited = changes.some((c) => c.type !== 'select' && c.type !== 'dimensions');
        return {
          nodes: applyNodeChanges(changes, s.nodes),
          dirty: s.dirty || edited,
          revision: edited ? s.revision + 1 : s.revision,
        };
      }),

    onEdgesChange: (changes) =>
      set((s) => {
        const edited = changes.some((c) => c.type !== 'select');
        return {
          edges: applyEdgeChanges(changes, s.edges),
          dirty: s.dirty || edited,
          revision: edited ? s.revision + 1 : s.revision,
        };
      }),

    onConnect: (connection) =>
      set((s) => ({ edges: addEdge(connection, s.edges), dirty: true, revision: s.revision + 1 })),

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
        // Keep labels unique on creation — a second node of the same type would
        // otherwise share its title (e.g. two "HTTP Request" nodes).
        data: { kind, label: uniqueLabel(def.title, get().nodes.map((n) => n.data.label)), params: {} },
      };
      set((s) => ({ nodes: [...s.nodes, node], selectedId: id, dirty: true, revision: s.revision + 1 }));
    },

    updateNodeParams: (id, params) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, params } } : n)),
        dirty: true,
        revision: s.revision + 1,
      })),

    setLabel: (id, label) =>
      set((s) => {
        const node = s.nodes.find((n) => n.id === id);
        if (!node) return {};
        const others = s.nodes.filter((n) => n.id !== id).map((n) => n.data.label);
        const unique = uniqueLabel(label, others, node.data.label);
        if (unique === node.data.label) return {}; // no-op (unchanged after de-dup)
        return {
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: unique } } : n)),
          dirty: true,
          revision: s.revision + 1,
        };
      }),

    removeNode: (id) =>
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        edges: s.edges.filter((e) => e.source !== id && e.target !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        dirty: true,
        revision: s.revision + 1,
      })),

    select: (id) => set({ selectedId: id }),

    // Reflect a run's per-node state onto the canvas: status drives the node's
    // border/badge, error surfaces the failure message inline. Nodes absent from
    // the run are cleared, so a re-run doesn't leave stale status/error behind.
    applyRunState: (runs) =>
      set((s) => {
        const byId = new Map(runs.map((r) => [r.nodeId, r]));
        return {
          nodes: s.nodes.map((n) => {
            const r = byId.get(n.id);
            return { ...n, data: { ...n.data, status: r?.status, error: r?.error } };
          }),
        };
      }),

    // Clear `dirty` only if no edit landed since the save that's completing
    // started (its revision). Called with no argument it clears unconditionally.
    markSaved: (atRevision) =>
      set((s) => (atRevision !== undefined && atRevision !== s.revision ? {} : { dirty: false })),

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
