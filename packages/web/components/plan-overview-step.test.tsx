import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

const getProjectDocs = vi.fn();
const startProjectPlanOverviewRun = vi.fn();
const getProjectPlanOverviewRun = vi.fn();
vi.mock('@/lib/api', () => ({
  getProjectDocs: (...a: unknown[]) => getProjectDocs(...a),
  startProjectPlanOverviewRun: (...a: unknown[]) => startProjectPlanOverviewRun(...a),
  getProjectPlanOverviewRun: (...a: unknown[]) => getProjectPlanOverviewRun(...a),
}));

// The live PTY view is exercised elsewhere (it needs a real WS + xterm); here we
// only need to know it was mounted against the right terminal id.
vi.mock('@/components/live-terminal', () => ({
  LiveTerminal: ({ attachId }: { attachId: string }) => (
    <div data-testid="live-terminal">terminal:{attachId}</div>
  ),
}));

import { PlanOverviewStep } from './plan-overview-step';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe('PlanOverviewStep', () => {
  it('lists project docs unchecked by default, drafts an overview live, and approves it', async () => {
    getProjectDocs.mockResolvedValue([
      { id: 'd1', projectId: 'p1', name: 'PRD', tag: 'PRD', color: '#fff', content: '', createdAt: '', updatedAt: '' },
      { id: 'd2', projectId: 'p1', name: 'Tech Spec', tag: 'SPEC', color: '#fff', content: '', createdAt: '', updatedAt: '' },
    ]);
    startProjectPlanOverviewRun.mockResolvedValue({ runId: 'r1', terminalId: 'project-plan-r1' });
    // Deferred so the test can assert the *live* (running) state before the
    // run settles — an immediately-resolved mock would race past it.
    let resolveRun!: (v: { status: string; output?: string; error?: string }) => void;
    getProjectPlanOverviewRun.mockImplementation(
      () => new Promise((resolve) => { resolveRun = resolve; }),
    );

    const onApprove = vi.fn();
    render(<PlanOverviewStep projectId="p1" onApprove={onApprove} />);

    await waitFor(() => expect(screen.getByText('PRD')).toBeInTheDocument());
    expect(screen.getByText('Tech Spec')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(checkboxes.every((c) => !c.checked)).toBe(true);

    // Select the PRD doc, then draft.
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(screen.getByRole('button', { name: /Draft overview/ }));

    await waitFor(() => expect(startProjectPlanOverviewRun).toHaveBeenCalledWith('p1', ['d1']));
    await waitFor(() => expect(screen.getByTestId('live-terminal')).toHaveTextContent('project-plan-r1'));

    // Settle the run — the captured output shows with Approve/Regenerate.
    resolveRun({ status: 'done', output: '# Overview\n\nDo the thing.' });
    await waitFor(() => expect(screen.getByText(/Do the thing/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Approve/ }));
    expect(onApprove).toHaveBeenCalledWith('# Overview\n\nDo the thing.');
  });

  it('surfaces an error status without crashing', async () => {
    getProjectDocs.mockResolvedValue([]);
    startProjectPlanOverviewRun.mockResolvedValue({ runId: 'r1', terminalId: 'project-plan-r1' });
    getProjectPlanOverviewRun.mockResolvedValue({ status: 'error', error: 'process exited with code 1' });

    render(<PlanOverviewStep projectId="p1" onApprove={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/no docs yet/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Draft overview/ }));
    await waitFor(() =>
      expect(screen.getByText('process exited with code 1')).toBeInTheDocument(),
    );
    // No Approve action on a failed run — only Regenerate.
    expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  });
});
