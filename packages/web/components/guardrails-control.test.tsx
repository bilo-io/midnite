import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GuardrailSettings } from '@midnite/shared';
import { GuardrailsBanner, GuardrailsControl } from './guardrails-control';
import { ConfirmProvider } from './confirm-dialog';
import { withLocale } from '@/lib/test-locale-wrapper';
import { ToastProvider } from './toast';

vi.mock('@/lib/api', () => ({
  pauseGuardrails: vi.fn(async () => running),
  emergencyStopGuardrails: vi.fn(async () => paused),
}));
import { emergencyStopGuardrails, pauseGuardrails } from '@/lib/api';

const running: GuardrailSettings = {
  pausedGlobal: false,
  pausedRepos: [],
  pausedTeams: [],
  pausedBy: null,
  pausedAt: null,
};
const paused: GuardrailSettings = { ...running, pausedGlobal: true, pausedBy: 'admin', pausedAt: 'now' };

function wrap(ui: React.ReactNode) {
  return render(
    withLocale(
      <ToastProvider>
        <ConfirmProvider>{ui}</ConfirmProvider>
      </ToastProvider>,
    ),
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('GuardrailsBanner', () => {
  it('renders nothing when not paused', () => {
    const { container } = wrap(<GuardrailsBanner guardrails={running} onChange={() => {}} />);
    expect(container.textContent).toBe('');
  });

  it('shows a paused banner and resumes on click', async () => {
    const onChange = vi.fn();
    wrap(<GuardrailsBanner guardrails={paused} onChange={onChange} />);
    expect(screen.getByText(/no new agents will start/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    await waitFor(() => expect(pauseGuardrails).toHaveBeenCalledWith({ kind: 'global' }, false));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(running));
  });

  it('shows a scoped-pause message when only repos/teams are paused', () => {
    wrap(
      <GuardrailsBanner
        guardrails={{ ...running, pausedRepos: ['acme/api'] }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/paused for 1 scope/i)).toBeTruthy();
  });
});

describe('GuardrailsControl', () => {
  it('surfaces pause + emergency-stop directly (no dropdown) and pauses on click', async () => {
    const onChange = vi.fn();
    wrap(<GuardrailsControl guardrails={running} onChange={onChange} />);

    // Both actions are present as top-level buttons — no menu to open.
    expect(screen.getByRole('button', { name: /pause scheduling/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /emergency stop/i })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /pause scheduling/i }));
    await waitFor(() => expect(pauseGuardrails).toHaveBeenCalledWith({ kind: 'global' }, true));
  });

  it('confirms before an emergency stop, then aborts', async () => {
    wrap(<GuardrailsControl guardrails={running} onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /emergency stop/i }));

    // The confirm dialog appears; accept it (scoped to the dialog, since the
    // toolbar trigger shares the "Emergency stop" accessible name).
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /^emergency stop$/i }));
    await waitFor(() => expect(emergencyStopGuardrails).toHaveBeenCalledWith({ kind: 'global' }));
  });

  it('renders a Resume button when already globally paused', () => {
    wrap(<GuardrailsControl guardrails={paused} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /resume/i })).toBeTruthy();
  });
});
