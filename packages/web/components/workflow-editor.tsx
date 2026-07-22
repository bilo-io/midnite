'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import {
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  X,
  type LucideIcon,
} from 'lucide-react';
import { WORKFLOW_TEMPLATE_CATEGORIES, type WorkflowTemplateCategory } from '@midnite/shared';
import type { Workflow } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NodeConfigPanel } from '@/components/node-config-panel';
import { NodePalette } from '@/components/node-palette';
import { RunHistoryPanel } from '@/components/run-history-panel';
import { RunOutputPanel } from '@/components/run-output-panel';
import { WorkflowPageHeader } from '@/components/workflow-page-header';
import { createWorkflowTemplateFromWorkflow, updateWorkflow } from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { useAutosave } from '@/lib/use-autosave';
import { useWorkflowRun } from '@/lib/use-workflow-run';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';
import { cn } from '@/lib/utils';

function SaveAsTemplateModal({
  workflowId,
  workflowName,
  onClose,
  onSaved,
}: {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
  onSaved: (templateId: string) => void;
}) {
  const [name, setName] = useState(workflowName);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WorkflowTemplateCategory>('monitoring');
  const [tagsRaw, setTagsRaw] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const tpl = await createWorkflowTemplateFromWorkflow({
        workflowId,
        name: name.trim() || workflowName,
        description: description.trim() || undefined,
        category,
        tags,
        published,
      });
      onSaved(tpl.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">Save as template</h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted/60" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium">Template name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={workflowName} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this template do?" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WorkflowTemplateCategory)}
              className="w-full rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {WORKFLOW_TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Tags <span className="text-muted-foreground">(comma-separated)</span></label>
            <Input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="e.g. slack, tasks, daily" />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded" />
            Publish (visible to team)
          </label>
        </div>

        {error ? <p className="mt-3 text-xs text-destructive">{error}</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
            Save template
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const router = useRouter();
  const [store] = useState(() => createWorkflowStore(workflow));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const runner = useWorkflowRun(workflow.id);

  // Reflect live run state (status + failure message) onto the canvas nodes.
  useEffect(() => {
    store.getState().applyRunState(runner.run?.nodeRuns ?? []);
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
    const atRevision = state.revision;
    const graph = state.toGraph();
    try {
      await updateWorkflow(workflow.id, {
        name: state.name,
        description: state.description,
        enabled: state.enabled,
        trigger: state.trigger,
        nodes: graph.nodes,
        edges: graph.edges,
      });
      // Only mark clean if no edit landed during the round-trip; otherwise the
      // edit stays dirty and autosave re-fires (it isn't silently lost).
      store.getState().markSaved(atRevision);
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

  // Persist dirty edits automatically after a quiet interval; pause while a save
  // is in flight or a run is active (run() saves first), so we never double-POST.
  useAutosave(store, () => void save(), () => saving || runner.running);

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
        {/* Full-screen editor column — the shared `PageHeader` (back + editable
            title/subtitle) sits at the top, mirroring the other detail cockpits
            (e.g. the dependency graph). Its left-aligned content clears the app's
            fixed top-right header-actions cluster, so no manual offset is needed.
            Height subtracts the desktop title bar (the layout pads by
            --titlebar-h) so the column fits the viewport exactly — otherwise the
            48px document overflow lets the header/palette scroll behind the bar. */}
        <div className="flex h-[calc(100dvh_-_var(--titlebar-h,0px))] w-full flex-col overflow-hidden">
          <WorkflowPageHeader
            onRun={() => void run()}
            onSave={() => void save()}
            onEditTrigger={editTrigger}
            onHistory={() => setHistoryOpen((o) => !o)}
            onSaveAsTemplate={() => setSaveAsTemplateOpen(true)}
            historyOpen={historyOpen}
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

          <div className="relative flex min-h-0 flex-1" data-tour="workflow-canvas">
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
              {!historyOpen ? (
                <PanelToggle
                  side="right"
                  open={configOpen}
                  onToggle={() => setConfigOpen((o) => !o)}
                  label={configOpen ? 'Hide config panel' : 'Show config panel'}
                />
              ) : null}
            </div>

            {historyOpen ? (
              <RunHistoryPanel
                workflowId={workflow.id}
                onClose={() => setHistoryOpen(false)}
              />
            ) : (
              <div
                className={cn(
                  'flex h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none',
                  configOpen ? 'w-80' : 'w-0',
                )}
              >
                <NodeConfigPanel workflowId={workflow.id} run={runner.run} />
              </div>
            )}
          </div>

          <RunOutputPanel run={runner.run} />
        </div>
      </ReactFlowProvider>

      {saveAsTemplateOpen ? (
        <SaveAsTemplateModal
          workflowId={workflow.id}
          workflowName={store.getState().name}
          onClose={() => setSaveAsTemplateOpen(false)}
          onSaved={(templateId) => {
            setSaveAsTemplateOpen(false);
            router.push(`/workflows/templates?highlight=${templateId}`);
          }}
        />
      ) : null}
    </WorkflowStoreContext.Provider>
  );
}
