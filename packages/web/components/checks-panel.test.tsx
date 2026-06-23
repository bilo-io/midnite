import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CheckRun } from '@midnite/shared';

const getCheckRuns = vi.fn();
const triggerCheck = vi.fn();
vi.mock('@/lib/api', () => ({
  getCheckRuns: (...args: unknown[]) => getCheckRuns(...args),
  triggerCheck: (...args: unknown[]) => triggerCheck(...args),
}));

import { ChecksPanel } from './checks-panel';

afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
});

const NOW = '2026-06-23T10:00:00.000Z';
const NOW2 = '2026-06-23T11:00:00.000Z';

function makeRun(overrides: Partial<CheckRun> = {}): CheckRun {
  return {
    id: 'r1',
    taskId: 't1',
    trigger: 'manual',
    startedAt: NOW,
    finishedAt: NOW,
    passed: true,
    results: [],
    ...overrides,
  };
}

describe('ChecksPanel — empty state', () => {
  it('shows empty state when there are no runs', async () => {
    getCheckRuns.mockResolvedValue({ runs: [] });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => expect(screen.getByText(/No checks have been run/)).toBeInTheDocument());
  });
});

describe('ChecksPanel — with runs', () => {
  it('shows pass/fail badge for a passing latest run', async () => {
    getCheckRuns.mockResolvedValue({ runs: [makeRun({ passed: true })] });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => expect(screen.getByText('Passed')).toBeInTheDocument());
    expect(screen.queryByText('Failed')).toBeNull();
  });

  it('shows a failed badge for a failing run', async () => {
    getCheckRuns.mockResolvedValue({
      runs: [makeRun({ passed: false })],
    });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
    expect(screen.queryByText('Passed')).toBeNull();
  });

  it('renders per-check results with name, duration and pass icon', async () => {
    getCheckRuns.mockResolvedValue({
      runs: [
        makeRun({
          results: [
            { name: 'lint', command: 'pnpm lint', exitCode: 0, passed: true, durationMs: 1234, output: '' },
            { name: 'typecheck', command: 'pnpm tsc', exitCode: 1, passed: false, durationMs: 567, output: 'error TS2345' },
          ],
        }),
      ],
    });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => expect(screen.getByText('lint')).toBeInTheDocument());
    expect(screen.getByText('typecheck')).toBeInTheDocument();
    // durations shown
    expect(screen.getByText('1.2s')).toBeInTheDocument();
    expect(screen.getByText('567ms')).toBeInTheDocument();
  });

  it('shows older runs collapsed when multiple runs exist', async () => {
    const run1 = makeRun({ id: 'r1', passed: false, startedAt: NOW, finishedAt: NOW });
    const run2 = makeRun({ id: 'r2', passed: true, startedAt: NOW2, finishedAt: NOW2 });
    getCheckRuns.mockResolvedValue({ runs: [run1, run2] });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => expect(screen.getByText('Latest run')).toBeInTheDocument());
    // older run is hidden inside a <details>
    expect(screen.getByText(/1 older run/)).toBeInTheDocument();
  });
});

describe('ChecksPanel — re-run button', () => {
  it('shows the re-run checks button', async () => {
    getCheckRuns.mockResolvedValue({ runs: [] });
    render(<ChecksPanel taskId="t1" />);

    await waitFor(() => screen.getByRole('button', { name: 're-run checks', exact: false }));
    expect(screen.getByRole('button', { name: /re-run checks/i })).toBeInTheDocument();
  });

  it('triggers check and refreshes list on re-run click', async () => {
    const user = userEvent.setup();
    const newRun = makeRun({ id: 'r2', passed: false });
    getCheckRuns
      .mockResolvedValueOnce({ runs: [] })        // initial fetch
      .mockResolvedValueOnce({ runs: [newRun] });  // after re-run
    triggerCheck.mockResolvedValue({ run: newRun });

    render(<ChecksPanel taskId="t1" />);
    await waitFor(() => screen.getByRole('button', { name: /re-run checks/i }));

    await user.click(screen.getByRole('button', { name: /re-run checks/i }));

    await waitFor(() => expect(triggerCheck).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.getByText('Failed')).toBeInTheDocument());
  });
});
