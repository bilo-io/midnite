import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowRunSchema, WorkflowSchema, type Workflow, type WorkflowRun } from '@midnite/shared';

import { NodeConfigPanel } from './node-config-panel';
import { ConfirmProvider } from './confirm-dialog';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';

function setup(selectId: string) {
  const workflow: Workflow = WorkflowSchema.parse({
    id: 'wf-1',
    name: 'Test',
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch', params: {} },
      // n2's URL is already a template — its field should seed into expression mode.
      { id: 'n2', type: 'http.request', position: { x: 120, y: 0 }, label: 'Claude', params: { url: '{{ $json.id }}' } },
    ],
    edges: [],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  const store = createWorkflowStore(workflow);
  store.getState().select(selectId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <WorkflowStoreContext.Provider value={store}>
        <ConfirmProvider>
          <NodeConfigPanel workflowId="wf-1" />
        </ConfirmProvider>
      </WorkflowStoreContext.Provider>
    </QueryClientProvider>,
  );
  return store;
}

const urlOf = (store: ReturnType<typeof setup>, id: string) =>
  store.getState().nodes.find((n) => n.id === id)!.data.params.url;

describe('NodeConfigPanel — ƒx toggle', () => {
  it('round-trips a field between literal and expression mode', () => {
    const store = setup('n1');
    // The URL field is expressionable and starts literal (no value yet).
    expect(screen.queryByLabelText('URL expression')).toBeNull();

    fireEvent.click(screen.getByLabelText('Toggle expression mode for URL'));
    fireEvent.change(screen.getByLabelText('URL expression'), { target: { value: '{{ $json.url }}' } });
    expect(urlOf(store, 'n1')).toBe('{{ $json.url }}');

    // Toggling back to literal keeps the value (round-trip, not discarded).
    fireEvent.click(screen.getByLabelText('Toggle expression mode for URL'));
    expect(screen.queryByLabelText('URL expression')).toBeNull();
    expect(urlOf(store, 'n1')).toBe('{{ $json.url }}');
  });

  it('seeds expression mode from a value that is already a template', () => {
    setup('n2'); // n2.url = '{{ $json.id }}'
    const expr = screen.getByLabelText('URL expression');
    expect(expr).toHaveValue('{{ $json.id }}');
  });
});

// A two-node workflow (Fetch → Claude) with a finished run, so the selected
// node's expression context has both its own `$json` input and the upstream
// `$node["Fetch"]` output to explore.
function setupWithRun(selectId: string) {
  const workflow: Workflow = WorkflowSchema.parse({
    id: 'wf-1',
    name: 'Test',
    trigger: { type: 'manual' },
    nodes: [
      { id: 'n1', type: 'http.request', position: { x: 0, y: 0 }, label: 'Fetch', params: {} },
      { id: 'n2', type: 'http.request', position: { x: 120, y: 0 }, label: 'Claude', params: {} },
    ],
    edges: [{ id: 'e1', source: 'n1', sourcePort: 'main', target: 'n2', targetPort: 'main' }],
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  const run: WorkflowRun = WorkflowRunSchema.parse({
    id: 'r1',
    workflowId: 'wf-1',
    status: 'succeeded',
    triggerSource: 'manual',
    startedAt: '2026-06-21T00:00:00.000Z',
    nodeRuns: [
      { id: 'nr1', runId: 'r1', nodeId: 'n1', nodeType: 'http.request', status: 'succeeded', output: { body: { title: 'Bug' } } },
      { id: 'nr2', runId: 'r1', nodeId: 'n2', nodeType: 'http.request', status: 'succeeded', input: { body: { title: 'Bug' } } },
    ],
  });
  const store = createWorkflowStore(workflow);
  store.getState().select(selectId);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <WorkflowStoreContext.Provider value={store}>
        <ConfirmProvider>
          <NodeConfigPanel workflowId="wf-1" run={run} />
        </ConfirmProvider>
      </WorkflowStoreContext.Provider>
    </QueryClientProvider>,
  );
  return store;
}

describe('NodeConfigPanel — expression editor', () => {
  const enterFx = () => {
    fireEvent.click(screen.getByLabelText('Toggle expression mode for URL'));
    return screen.getByLabelText('URL expression');
  };

  it('previews what an expression resolves to from the last run', () => {
    setupWithRun('n2'); // $json = n2's input = { body: { title: 'Bug' } }
    const input = enterFx();
    fireEvent.change(input, { target: { value: '{{ $json.body.title }}' } });
    expect(screen.getByText('Bug')).toBeInTheDocument();
  });

  it('shows the resolution error for a missing reference', () => {
    setupWithRun('n2');
    const input = enterFx();
    fireEvent.change(input, { target: { value: '{{ $json.body.missing.x }}' } });
    expect(screen.getByText(/does not resolve/i)).toBeInTheDocument();
  });

  it('autocompletes object keys after a parent path', () => {
    setupWithRun('n2');
    const input = enterFx();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '{{ $json.', selectionStart: 9 } });
    const list = screen.getByRole('listbox', { name: /URL expression suggestions/i });
    expect(within(list).getByText('body')).toBeInTheDocument();
  });

  it('inserts a reference from the data picker', () => {
    const store = setupWithRun('n2');
    enterFx();
    fireEvent.click(screen.getByLabelText('Toggle data picker for URL'));
    // The upstream node is explorable by label, and its root inserts a reference.
    fireEvent.click(screen.getByTitle('Insert $node["Fetch"]'));
    expect(store.getState().nodes.find((n) => n.id === 'n2')!.data.params.url).toBe('{{ $node["Fetch"] }}');
  });
});

describe('NodeConfigPanel — rename', () => {
  it('auto-suffixes a label that collides with another node', () => {
    const store = setup('n1'); // n1 'Fetch', n2 'Claude'
    const input = screen.getByLabelText('Node label');
    fireEvent.change(input, { target: { value: 'Claude' } }); // collides with n2
    fireEvent.blur(input);
    expect(store.getState().nodes.find((n) => n.id === 'n1')!.data.label).toBe('Claude 2');
  });
});
