'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeRunStatus, Workflow } from '@midnite/shared';
import { NodeConfigPanel } from '@/components/node-config-panel';
import { NodePalette } from '@/components/node-palette';
import { RunOutputPanel } from '@/components/run-output-panel';
import { WorkflowToolbar } from '@/components/workflow-toolbar';
import { updateWorkflow } from '@/lib/api';
import { useWorkflowRun } from '@/lib/use-workflow-run';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';

const WorkflowCanvas = dynamic(() => import('@/components/workflow-canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading canvas…
    </div>
  ),
});

export function WorkflowEditor({ workflow }: { workflow: Workflow }) {
  const router = useRouter();
  const [store] = useState(() => createWorkflowStore(workflow));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runner = useWorkflowRun(workflow.id);

  // Reflect live run state onto the canvas nodes.
  useEffect(() => {
    const map: Record<string, NodeRunStatus> = {};
    for (const nr of runner.run?.nodeRuns ?? []) map[nr.nodeId] = nr.status;
    store.getState().applyRunStatuses(map);
  }, [runner.run, store]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const state = store.getState();
    const graph = state.toGraph();
    try {
      await updateWorkflow(workflow.id, {
        name: state.name,
        enabled: state.enabled,
        trigger: state.trigger,
        nodes: graph.nodes,
        edges: graph.edges,
      });
      state.markSaved();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    if (store.getState().dirty) await save();
    await runner.start();
  };

  return (
    <WorkflowStoreContext.Provider value={store}>
      <ReactFlowProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden">
          <WorkflowToolbar onRun={() => void run()} onSave={() => void save()} running={runner.running} saving={saving} />
          {error || runner.error ? (
            <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              {error ?? runner.error}
            </div>
          ) : null}
          <div className="flex min-h-0 flex-1">
            <NodePalette />
            <div className="relative min-w-0 flex-1">
              <WorkflowCanvas />
            </div>
            <NodeConfigPanel workflowId={workflow.id} />
          </div>
          <RunOutputPanel run={runner.run} />
        </div>
      </ReactFlowProvider>
    </WorkflowStoreContext.Provider>
  );
}
