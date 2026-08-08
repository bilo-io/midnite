import { screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetupWizard } from './SetupWizard';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { getCliStatuses, updateAgentPool } from '@/lib/api';

// Stub the API calls used in wizard steps.
vi.mock('@/lib/api', () => ({
  getProviders: vi.fn().mockResolvedValue({ providers: [], activeProvider: null }),
  getEnvironment: vi.fn().mockResolvedValue({ os: 'mac', byOs: {} }),
  getCliStatuses: vi.fn().mockResolvedValue([]),
  getSetupStatus: vi.fn().mockResolvedValue({
    ready: false,
    items: [],
    agentPool: { pool: 4, poolEnabled: false },
  }),
  updateProvider: vi.fn().mockResolvedValue({}),
  setActiveProvider: vi.fn().mockResolvedValue({}),
  updateAgentPool: vi.fn().mockResolvedValue({ ready: true, items: [] }),
  createRepo: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCliStatuses).mockResolvedValue([]);
  vi.mocked(updateAgentPool).mockResolvedValue({ ready: true, items: [] });
});

describe('SetupWizard', () => {
  it('renders nothing when closed', () => {
    render(<SetupWizard open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the dialog with step breadcrumb when open', () => {
    render(<SetupWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Setup wizard' })).toBeTruthy();
    // Step labels appear in the breadcrumb (queryAllByText since "AI provider" also
    // appears as a heading inside the active step body).
    expect(screen.getAllByText('AI provider').length).toBeGreaterThan(0);
    expect(screen.getByText('System tools')).toBeTruthy();
    expect(screen.getByText('Repository')).toBeTruthy();
    expect(screen.getByText("Ready!")).toBeTruthy();
  });

  it('shows the Provider step first', () => {
    render(<SetupWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/api key/i)).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<SetupWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(<SetupWizard open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  describe('Concurrency step', () => {
    /** Walk the wizard from the Provider step through Tools to the Pool step.
     *  "Save and continue" stays disabled until a key is entered, so supply one. */
    async function goToPoolStep() {
      render(<SetupWizard open={true} onClose={vi.fn()} />);
      fireEvent.change(screen.getByLabelText(/api key/i), { target: { value: 'sk-test' } });
      fireEvent.click(screen.getByRole('button', { name: /save and continue/i })); // → Tools
      await waitFor(() => screen.getByRole('button', { name: /^continue$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^continue$/i })); // → Pool
      await waitFor(() => expect(screen.getByRole('slider')).toBeTruthy());
    }

    it('writes the pool settings to the gateway, not just localStorage', async () => {
      // The regression this whole route exists for: the slider used to persist
      // to localStorage, which the gateway never reads — so a fresh install
      // could finish setup and never run a task.
      await goToPoolStep();

      fireEvent.change(screen.getByRole('slider'), { target: { value: '6' } });
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() =>
        expect(updateAgentPool).toHaveBeenCalledWith({ pool: 6, poolEnabled: true }),
      );
    });

    it('lets autonomy be declined without blocking the wizard', async () => {
      await goToPoolStep();

      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: /continue/i }));

      await waitFor(() =>
        expect(updateAgentPool).toHaveBeenCalledWith(
          expect.objectContaining({ poolEnabled: false }),
        ),
      );
    });

    it('seeds the slider from the gateway rather than a local default', async () => {
      await goToPoolStep();
      // getSetupStatus reports pool 4, so the slider must show the server's
      // value — not DEFAULT_SETTINGS.agentPoolSize out of localStorage.
      await waitFor(() => expect(screen.getByRole('slider').getAttribute('value')).toBe('4'));
    });
  });
});
