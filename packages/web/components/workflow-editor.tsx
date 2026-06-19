'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  type LucideIcon,
} from 'lucide-react';
import type { NodeRunStatus, Workflow } from '@midnite/shared';
import { NodeConfigPanel } from '@/components/node-config-panel';
import { NodePalette } from '@/components/node-palette';
import { RunOutputPanel } from '@/components/run-output-panel';
import { WorkflowToolbar } from '@/components/workflow-toolbar';
import { updateWorkflow } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useWorkflowRun } from '@/lib/use-workflow-run';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

const WorkflowCanvas = dynamic(() => import('@/components/workflow-canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Loading canvas…
    </div>
  ),
});

// A floating button that pins to the inner edge of the canvas and toggles the
// adjacent side panel. It glides with the panel because the canvas flexes as the
// panel's width animates.
function PanelToggle({
  side,
  open,
  onToggle,
  label,
}: {
  side: 'left' | 'right';
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  const Icon: LucideIcon =
    side === 'left'
      ? open
        ? PanelLeftClose
        : PanelLeftOpen
      : open
        ? PanelRightClose
        : PanelRightOpen;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={open}
      title={label}
      className={cn(
        'absolute top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-card/80 text-muted-foreground shadow-sm backdrop-blur transition-colors duration-200 hover:bg-accent hover:text-foreground motion-reduce:transition-none',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function WorkflowEditor({ workflow }: { workflow: Workflow }) {
  const [store] = useState(() => createWorkflowStore(workflow));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const runner = useWorkflowRun(workflow.id);

  // Reflect live run state onto the canvas nodes.
  useEffect(() => {
    const map: Record<string, NodeRunStatus> = {};
    for (const nr of runner.run?.nodeRuns ?? []) map[nr.nodeId] = nr.status;
    store.getState().applyRunStatuses(map);
  }, [runner.run, store]);

  // Open the config panel when a node is selected, so a node click is never a no-op
  // while the panel is collapsed.
  useEffect(() => {
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.selectedId && state.selectedId !== prev.selectedId) setConfigOpen(true);
    });
    return unsubscribe;
  }, [store]);

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
      invalidateData();
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

  // Surface the existing trigger editor (in the config panel) from the toolbar: select
  // the canonical trigger node and force the panel open even if it was collapsed.
  const editTrigger = () => {
    const triggerNode = store.getState().nodes.find((n) => n.data.kind.startsWith('trigger.'));
    if (triggerNode) store.getState().select(triggerNode.id);
    setConfigOpen(true);
  };

  const banner = error ?? runner.error;

  return (
    <WorkflowStoreContext.Provider value={store}>
      <ReactFlowProvider>
        <div className="flex h-screen w-full flex-col overflow-hidden">
          <WorkflowToolbar
            onRun={() => void run()}
            onSave={() => void save()}
            onEditTrigger={editTrigger}
            running={runner.running}
            saving={saving}
          />

          <div
            className={cn(
              'overflow-hidden bg-destructive/10 text-xs text-destructive transition-all duration-300 ease-in-out motion-reduce:transition-none',
              banner ? 'max-h-16 border-b border-destructive/40 px-4 py-2 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            {banner}
          </div>

          <div className="relative flex min-h-0 flex-1">
            <div
              className={cn(
                'flex h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
                paletteOpen ? 'w-52' : 'w-0',
              )}
            >
              <NodePalette />
            </div>

            <div className="relative min-w-0 flex-1">
              {/* Fill the flex cell via absolute insets, not height:100% — a
                  percentage height won't resolve against a flex item whose own
                  height is auto, which collapses React Flow's interaction pane
                  (nodes still render, but panning/dragging goes dead). */}
              <div className="absolute inset-0">
                <WorkflowCanvas />
              </div>
              <PanelToggle
                side="left"
                open={paletteOpen}
                onToggle={() => setPaletteOpen((o) => !o)}
                label={paletteOpen ? 'Hide node palette' : 'Show node palette'}
              />
              <PanelToggle
                side="right"
                open={configOpen}
                onToggle={() => setConfigOpen((o) => !o)}
                label={configOpen ? 'Hide config panel' : 'Show config panel'}
              />
            </div>

            <div
              className={cn(
                'flex h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
                configOpen ? 'w-80' : 'w-0',
              )}
            >
              <NodeConfigPanel workflowId={workflow.id} />
            </div>
          </div>

          <RunOutputPanel run={runner.run} />
        </div>
      </ReactFlowProvider>
    </WorkflowStoreContext.Provider>
  );
}
