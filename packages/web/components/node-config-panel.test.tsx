import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowSchema, type Workflow } from '@midnite/shared';

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
  render(
    <WorkflowStoreContext.Provider value={store}>
      <ConfirmProvider>
        <NodeConfigPanel workflowId="wf-1" />
      </ConfirmProvider>
    </WorkflowStoreContext.Provider>,
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

describe('NodeConfigPanel — rename', () => {
  it('auto-suffixes a label that collides with another node', () => {
    const store = setup('n1'); // n1 'Fetch', n2 'Claude'
    const input = screen.getByLabelText('Node label');
    fireEvent.change(input, { target: { value: 'Claude' } }); // collides with n2
    fireEvent.blur(input);
    expect(store.getState().nodes.find((n) => n.id === 'n1')!.data.label).toBe('Claude 2');
  });
});
