import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SetupWizard } from './SetupWizard';

// Stub the API calls used in wizard steps.
vi.mock('@/lib/api', () => ({
  getProviders: vi.fn().mockResolvedValue({ providers: [], activeProvider: null }),
  getEnvironment: vi.fn().mockResolvedValue({ os: 'mac', byOs: {} }),
  getSetupStatus: vi.fn().mockResolvedValue({ ready: false, items: [] }),
  updateProvider: vi.fn().mockResolvedValue({}),
  setActiveProvider: vi.fn().mockResolvedValue({}),
  createRepo: vi.fn().mockResolvedValue({}),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
});
