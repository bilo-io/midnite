import type { AssistantQueryResponse, TaskSummary } from '@midnite/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

const assistantQuery = vi.fn();
const getTasks = vi.fn();
const getTaskCounts = vi.fn();
const getSessions = vi.fn();
const getOpsMetrics = vi.fn();
const getGaugeHistory = vi.fn();
const getCycleTime = vi.fn();

vi.mock('@/lib/api', () => ({
  assistantQuery: (...a: unknown[]) => assistantQuery(...a),
  getTasks: (...a: unknown[]) => getTasks(...a),
  getTaskCounts: (...a: unknown[]) => getTaskCounts(...a),
  getSessions: (...a: unknown[]) => getSessions(...a),
  getOpsMetrics: (...a: unknown[]) => getOpsMetrics(...a),
  getGaugeHistory: (...a: unknown[]) => getGaugeHistory(...a),
  getCycleTime: (...a: unknown[]) => getCycleTime(...a),
  gatewayUrl: (p: string) => p,
}));

import { AgentChat } from './agent-chat';
import { withQueryClient } from '@/lib/test-query-wrapper';

const TASK: TaskSummary = {
  id: 't1',
  title: 'Fix the login bug',
  status: 'todo',
  priority: 2,
  retryCount: 0,
  tags: [],
} as TaskSummary;

function answer(res: AssistantQueryResponse) {
  assistantQuery.mockResolvedValueOnce(res);
}

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  getTasks.mockResolvedValue([TASK]);
});

describe('AgentChat', () => {
  it('shows example prompts when idle', () => {
    render(withQueryClient(<AgentChat />));
    expect(screen.getByText(/what should I focus on/i)).toBeInTheDocument();
  });

  it('renders a markdown answer + the inference-path line', async () => {
    answer({ blocks: [{ kind: 'markdown', text: 'One task is blocked.' }], inferencePath: 'deterministic' });
    render(withQueryClient(<AgentChat />));
    fireEvent.change(screen.getByLabelText(/ask the fleet assistant/i), { target: { value: 'what is blocked?' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(await screen.findByText('what is blocked?')).toBeInTheDocument(); // user turn
    expect(await screen.findByText('One task is blocked.')).toBeInTheDocument(); // assistant markdown
    expect(screen.getByText(/no AI used/i)).toBeInTheDocument(); // deterministic cost line
    expect(assistantQuery).toHaveBeenCalledWith('what is blocked?', expect.anything());
  });

  it('resolves a task-card component block by id against the task list', async () => {
    answer({
      blocks: [{ kind: 'component', name: 'task-card', props: { taskId: 't1' } }],
      inferencePath: 'provider',
    });
    render(withQueryClient(<AgentChat />));
    fireEvent.change(screen.getByLabelText(/ask the fleet assistant/i), { target: { value: 'show me t1' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(await screen.findByText('Fix the login bug')).toBeInTheDocument();
    await waitFor(() => expect(getTasks).toHaveBeenCalled());
  });

  it('shows a graceful notice when a referenced task is gone', async () => {
    getTasks.mockResolvedValue([]); // task no longer on the board
    answer({
      blocks: [{ kind: 'component', name: 'task-card', props: { taskId: 'ghost' } }],
      inferencePath: 'provider',
    });
    render(withQueryClient(<AgentChat />));
    fireEvent.change(screen.getByLabelText(/ask the fleet assistant/i), { target: { value: 'show ghost' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(await screen.findByText(/no longer on the board/i)).toBeInTheDocument();
  });

  it('surfaces an error turn when the request fails', async () => {
    assistantQuery.mockRejectedValueOnce(new Error('gateway down'));
    render(withQueryClient(<AgentChat />));
    fireEvent.change(screen.getByLabelText(/ask the fleet assistant/i), { target: { value: 'status?' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(await screen.findByText('gateway down')).toBeInTheDocument();
  });
});
