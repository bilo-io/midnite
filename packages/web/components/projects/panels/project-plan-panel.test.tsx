import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Project, ProjectDoc, ProjectDocTemplate } from '@midnite/shared';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const getProjectDocs = vi.fn();
const createProjectDoc = vi.fn();
const deleteProjectDoc = vi.fn();
const updateProjectDoc = vi.fn();
const generateProjectDoc = vi.fn();
vi.mock('@/lib/api', () => ({
  getProjectDocs: (...a: unknown[]) => getProjectDocs(...a),
  createProjectDoc: (...a: unknown[]) => createProjectDoc(...a),
  deleteProjectDoc: (...a: unknown[]) => deleteProjectDoc(...a),
  updateProjectDoc: (...a: unknown[]) => updateProjectDoc(...a),
  generateProjectDoc: (...a: unknown[]) => generateProjectDoc(...a),
}));

// A confirm that always accepts, so the remove path runs without a dialog.
vi.mock('@/components/confirm-dialog', () => ({ useConfirm: () => () => Promise.resolve(true) }));

// Isolate the panel from the full editor modal — covered by plan-doc-modal.test.tsx.
vi.mock('@/components/plan-doc-modal', () => ({
  PlanDocModal: ({ doc }: { doc: ProjectDoc }) => <div data-testid="doc-modal">{doc.name}</div>,
}));

import { ProjectPlanPanel } from './project-plan-panel';

const project: Project = {
  id: 'p1',
  name: 'Acme',
  tag: 'ACM',
  color: '#6366f1',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

const templates: ProjectDocTemplate[] = [
  { id: 'prd', name: 'PRD template', tag: 'PRD', color: '#6366f1', description: 'desc', content: '# PRD\n' },
];

function makeDoc(overrides: Partial<ProjectDoc> = {}): ProjectDoc {
  return {
    id: 'd1',
    projectId: 'p1',
    templateId: 'prd',
    name: 'PRD template',
    tag: 'PRD',
    color: '#6366f1',
    content: '# PRD — Acme',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ProjectPlanPanel', () => {
  it('fetches docs on mount and renders them', async () => {
    getProjectDocs.mockResolvedValue([makeDoc()]);
    render(<ProjectPlanPanel project={project} templates={templates} />);
    await waitFor(() => expect(getProjectDocs).toHaveBeenCalledWith('p1'));
    expect(await screen.findByText('PRD template')).toBeInTheDocument();
  });

  it('adds a document from a template and opens it', async () => {
    getProjectDocs.mockResolvedValue([]);
    createProjectDoc.mockResolvedValue(makeDoc());
    render(<ProjectPlanPanel project={project} templates={templates} />);
    await waitFor(() => expect(getProjectDocs).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Add document/ }));
    fireEvent.click(await screen.findByRole('option', { name: /PRD template/ }));

    await waitFor(() => expect(createProjectDoc).toHaveBeenCalledWith('p1', { templateId: 'prd' }));
    expect(await screen.findByTestId('doc-modal')).toHaveTextContent('PRD template');
  });

  it('removes a document after confirming', async () => {
    getProjectDocs.mockResolvedValue([makeDoc()]);
    deleteProjectDoc.mockResolvedValue(undefined);
    render(<ProjectPlanPanel project={project} templates={templates} />);
    await screen.findByText('PRD template');

    fireEvent.click(screen.getByRole('button', { name: /Remove document/ }));
    await waitFor(() => expect(deleteProjectDoc).toHaveBeenCalledWith('p1', 'd1'));
    await waitFor(() => expect(screen.queryByText('PRD template')).not.toBeInTheDocument());
  });

  it('surfaces an error when loading docs fails', async () => {
    getProjectDocs.mockRejectedValue(new Error('boom'));
    render(<ProjectPlanPanel project={project} templates={templates} />);
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
