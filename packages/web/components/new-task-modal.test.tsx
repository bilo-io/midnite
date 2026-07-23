import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import type { BulkCreateTaskResponse, Repo } from '@midnite/shared';

const createBulk = vi.fn();
const createTask = vi.fn();
vi.mock('@/lib/api', () => ({
  createBulk: (...args: unknown[]) => createBulk(...args),
  createTask: (...args: unknown[]) => createTask(...args),
}));

import { NewTaskModal } from './new-task-modal';

const BLOB = ['fix login bug', '- add dark mode', '# a comment', '', 'write docs'].join('\n');

const REPOS: Repo[] = [
  { id: 'r1', name: 'web', path: '~/Dev/web', createdAt: '', updatedAt: '' },
  { id: 'r2', name: 'gateway', path: '~/Dev/gateway', createdAt: '', updatedAt: '' },
];

// createTask/createBulk are module-level spies, so clear call history between
// tests — otherwise `mock.calls[0]` leaks the previous test's FormData.
beforeEach(() => {
  vi.clearAllMocks();
});

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

describe('NewTaskModal — column/project defaults', () => {
  // The per-project board's column "+" seeds the modal with a status and project.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the modal only reads id/name off a project
  const PROJECTS = [{ id: 'p1', name: 'Acme' } as any];

  it('pre-selects the project and status passed as defaults', () => {
    render(
      <NewTaskModal
        projects={PROJECTS}
        repos={[]}
        defaultStatus="backlog"
        defaultProjectId="p1"
        onCreated={vi.fn()}
        onBulkCreated={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe('p1');
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('backlog');
  });

  it('defaults to no project and Todo status when no defaults are given', () => {
    render(
      <NewTaskModal
        projects={PROJECTS}
        repos={[]}
        onCreated={vi.fn()}
        onBulkCreated={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect((screen.getByLabelText('Project') as HTMLSelectElement).value).toBe('');
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('todo');
  });
});

describe('NewTaskModal — repo picker (Phase 13 B1)', () => {
  it('hides the repo picker when there are no registered repos', () => {
    renderModal({ repos: [] });
    expect(screen.queryByLabelText('Repo')).toBeNull();
  });

  it('lists registered repos with an explicit Unassigned default', () => {
    renderModal({ repos: REPOS });
    const select = screen.getByLabelText('Repo') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toEqual(['Unassigned', 'web', 'gateway']);
    // Unassigned is the empty value (sent as no repo).
    expect(select.value).toBe('');
  });

  it('sends the chosen repo name on a single create', async () => {
    createTask.mockResolvedValueOnce({ task: { id: 't1', title: 'x', status: 'todo', kind: 'feature' } });
    renderModal({ repos: REPOS });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'tweak nav' } });
    fireEvent.change(screen.getByLabelText('Repo'), { target: { value: 'gateway' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));

    expect(createTask).toHaveBeenCalledTimes(1);
    const form = createTask.mock.calls[0]![0] as FormData;
    expect(form.get('repo')).toBe('gateway');
  });

  it('omits repo when left Unassigned', async () => {
    createTask.mockResolvedValueOnce({ task: { id: 't2', title: 'x', status: 'todo', kind: 'feature' } });
    renderModal({ repos: REPOS });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'no repo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));

    const form = createTask.mock.calls[0]![0] as FormData;
    expect(form.get('repo')).toBeNull();
  });
});
