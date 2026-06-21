import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BulkCreateTaskResponse, Repo } from '@midnite/shared';

const createBulk = vi.fn();
const createTask = vi.fn();
vi.mock('@/lib/api', () => ({
  createBulk: (...args: unknown[]) => createBulk(...args),
  createTask: (...args: unknown[]) => createTask(...args),
}));

// The api mocks are module-level, so reset call history between tests to keep
// per-test call-count assertions independent.
beforeEach(() => {
  createBulk.mockReset();
  createTask.mockReset();
});

import { NewTaskModal } from './new-task-modal';

const BLOB = ['fix login bug', '- add dark mode', '# a comment', '', 'write docs'].join('\n');

const REPO: Repo = { id: 'r1', name: 'midnite', path: '~/Dev/midnite', createdAt: '', updatedAt: '' };

function renderModal(overrides?: { onBulkCreated?: () => void; repos?: Repo[] }) {
  render(
    <NewTaskModal
      projects={[]}
      repos={overrides?.repos ?? []}
      onCreated={vi.fn()}
      onBulkCreated={overrides?.onBulkCreated ?? vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe('NewTaskModal — bulk paste', () => {
  it('defaults to single mode and shows the title field, not the bulk textarea', () => {
    renderModal();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.queryByLabelText('Tasks')).toBeNull();
  });

  it('previews the parsed task count and hides the status selector in bulk mode', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Bulk paste' }));

    fireEvent.change(screen.getByLabelText('Tasks'), { target: { value: BLOB } });

    // Comment + blank dropped, the "- " bullet stripped → 3 prompts.
    expect(screen.getByText('3 tasks detected.')).toBeInTheDocument();
    // The preview lists the cleaned prompts (the "- " marker is stripped).
    expect(screen.getByText('add dark mode')).toBeInTheDocument();
    // Bulk status is decided per task by triage, so no status control.
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create 3 tasks' })).toBeEnabled();
  });

  it('submits the raw text and renders the per-line result summary', async () => {
    const response: BulkCreateTaskResponse = {
      results: [
        { line: 'fix login bug', taskId: 't1', kind: 'bug', status: 'todo' },
        { line: 'add dark mode', taskId: 't2', kind: 'feature', status: 'backlog' },
        { line: 'write docs', error: 'classification failed' },
      ],
      counts: { created: 2, skipped: 0, failed: 1 },
    };
    createBulk.mockResolvedValueOnce(response);
    const onBulkCreated = vi.fn();
    renderModal({ onBulkCreated });

    fireEvent.click(screen.getByRole('button', { name: 'Bulk paste' }));
    fireEvent.change(screen.getByLabelText('Tasks'), { target: { value: BLOB } });
    fireEvent.click(screen.getByRole('button', { name: 'Create 3 tasks' }));

    // Sends the raw blob (gateway re-parses with the same helper), not a single prompt.
    expect(createBulk).toHaveBeenCalledWith(
      expect.objectContaining({ raw: expect.stringContaining('fix login bug') }),
    );

    // Summary counts + the failing line surfaced so it can be fixed and re-submitted.
    expect(await screen.findByText('2 created')).toBeInTheDocument();
    expect(screen.getByText('1 failed')).toBeInTheDocument();
    expect(screen.getByText('write docs')).toBeInTheDocument();
    expect(screen.getByText(/classification failed/)).toBeInTheDocument();
    expect(onBulkCreated).toHaveBeenCalledWith(response);
  });
});

describe('NewTaskModal — repo picker', () => {
  it('hides the repo control when no repos are registered', () => {
    renderModal();
    expect(screen.queryByLabelText('Repo')).toBeNull();
  });

  it('defaults to "Unassigned" and sends no repo field', async () => {
    createTask.mockResolvedValue({ task: { id: 't1', title: 'do thing', status: 'todo', events: [] } });
    renderModal({ repos: [REPO] });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'do thing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect((createTask.mock.calls[0]![0] as FormData).has('repo')).toBe(false);
  });

  it('sends the chosen repo name on the create form', async () => {
    createTask.mockResolvedValue({ task: { id: 't1', title: 'do thing', status: 'todo', events: [] } });
    renderModal({ repos: [REPO] });

    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'midnite' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'do thing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    expect((createTask.mock.calls[0]![0] as FormData).get('repo')).toBe('midnite');
  });
});
