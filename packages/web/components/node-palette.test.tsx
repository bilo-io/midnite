import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowSchema } from '@midnite/shared';

import { NodePalette } from './node-palette';
import { createWorkflowStore, WorkflowStoreContext } from '@/lib/workflow-store';

// A bare manual-trigger workflow with an empty canvas; defaults fill the rest.
function makeStore() {
  const workflow = WorkflowSchema.parse({
    id: 'wf-test',
    name: 'Test',
    trigger: { type: 'manual' },
    createdAt: '2026-06-21T00:00:00.000Z',
    updatedAt: '2026-06-21T00:00:00.000Z',
  });
  return createWorkflowStore(workflow);
}

function renderPalette() {
  const store = makeStore();
  render(
    <WorkflowStoreContext.Provider value={store}>
      <NodePalette />
    </WorkflowStoreContext.Provider>,
  );
  return store;
}

const search = () => screen.getByRole('searchbox', { name: 'Search nodes' });
const typeSearch = (value: string) => fireEvent.change(search(), { target: { value } });

describe('NodePalette', () => {
  it('groups draggable nodes under their categories', () => {
    renderPalette();
    for (const label of ['Actions', 'Logic', 'Data', 'Storage']) {
      expect(screen.getByText(label, { selector: 'span' })).toBeInTheDocument();
    }
  });

  it('surfaces the Phase 12 reshape & storage nodes', () => {
    renderPalette();
    for (const title of ['Set Data', 'Merge', 'Filter Fields', 'Store Value', 'Read Value']) {
      expect(screen.getByRole('button', { name: new RegExp(title) })).toBeInTheDocument();
    }
  });

  it('omits triggers — a workflow has one canonical trigger', () => {
    renderPalette();
    expect(screen.queryByRole('button', { name: /Manual Trigger/ })).toBeNull();
    expect(screen.queryByText('Triggers', { selector: 'span' })).toBeNull();
  });

  it('filters by title or description and shows an empty state', () => {
    renderPalette();
    typeSearch('filter');
    expect(screen.getByRole('button', { name: /Filter Fields/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /HTTP Request/ })).toBeNull();
    // The non-matching category header disappears too.
    expect(screen.queryByText('Actions', { selector: 'span' })).toBeNull();

    typeSearch('zzzz');
    expect(screen.getByText(/No nodes match/)).toBeInTheDocument();
  });

  it('collapses and expands a category section', () => {
    renderPalette();
    const header = screen.getByRole('button', { name: /Actions/ });
    expect(header).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /HTTP Request/ })).toBeInTheDocument();

    fireEvent.click(header);
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /HTTP Request/ })).toBeNull();

    fireEvent.click(header);
    expect(screen.getByRole('button', { name: /HTTP Request/ })).toBeInTheDocument();
  });

  it('adds a node to the canvas when clicked', () => {
    const store = renderPalette();
    fireEvent.click(screen.getByRole('button', { name: /Filter Fields/ }));
    const { nodes } = store.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.data.kind).toBe('data.filter');
  });
});
