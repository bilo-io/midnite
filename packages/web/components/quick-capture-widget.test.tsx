import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const createTask = vi.fn();
const createBulk = vi.fn();
const invalidateData = vi.fn();
vi.mock('@/lib/api', () => ({
  createTask: (...args: unknown[]) => createTask(...args),
  createBulk: (...args: unknown[]) => createBulk(...args),
}));
vi.mock('@/lib/data-refresh', () => ({
  invalidateData: () => invalidateData(),
}));

import { QuickCaptureWidget } from './quick-capture-widget';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('QuickCaptureWidget', () => {
  it('disables Add until there is non-blank text', () => {
    render(<QuickCaptureWidget />);
    const add = screen.getByRole('button', { name: 'Add' });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: '   ' } });
    expect(add).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'fix the bug' } });
    expect(add).toBeEnabled();
  });

  it('creates a single task, clears the field, confirms, and refreshes the board', async () => {
    createTask.mockResolvedValue({ task: { id: 't1', title: 'fix the bug' } });
    render(<QuickCaptureWidget />);

    const field = screen.getByLabelText('Task') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'fix the bug' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
    const form = createTask.mock.calls[0]![0] as FormData;
    expect(form.get('prompt')).toBe('fix the bug');
    expect(form.get('status')).toBe('todo');
    expect(createBulk).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/Added/)).toBeInTheDocument());
    expect(field.value).toBe('');
    expect(invalidateData).toHaveBeenCalledTimes(1);
  });

  it('submits a multi-line blob via the bulk endpoint when Bulk is on', async () => {
    createBulk.mockResolvedValue({ results: [], counts: { created: 2, skipped: 0, failed: 1 } });
    render(<QuickCaptureWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Bulk' }));
    const field = screen.getByLabelText('Tasks (one per line)');
    fireEvent.change(field, { target: { value: 'fix the bug\nwrite docs\n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(createBulk).toHaveBeenCalledTimes(1));
    expect(createBulk.mock.calls[0]![0]).toEqual({ raw: 'fix the bug\nwrite docs\n' });
    expect(createTask).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText(/Added 2 tasks · 1 failed/)).toBeInTheDocument());
  });

  it('surfaces an error and keeps the text when creation fails', async () => {
    createTask.mockRejectedValue(new Error('gateway unreachable'));
    render(<QuickCaptureWidget />);

    const field = screen.getByLabelText('Task') as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: 'fix the bug' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('gateway unreachable'));
    expect(field.value).toBe('fix the bug');
    expect(invalidateData).not.toHaveBeenCalled();
  });

  it('submits on ⌘/Ctrl+Enter', async () => {
    createTask.mockResolvedValue({ task: { id: 't1', title: 'fix the bug' } });
    render(<QuickCaptureWidget />);

    const field = screen.getByLabelText('Task');
    fireEvent.change(field, { target: { value: 'fix the bug' } });
    fireEvent.keyDown(field, { key: 'Enter', metaKey: true });

    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(1));
  });
});
