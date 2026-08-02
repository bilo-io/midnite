import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { LastRunStatus, WorkflowEnabledSwitch } from '@/components/workflow-controls';

vi.mock('@/lib/api', () => ({ updateWorkflow: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/data-refresh', () => ({ invalidateData: vi.fn() }));

describe('workflow controls (i18n)', () => {
  it('labels a workflow that has never run', () => {
    render(<LastRunStatus />);
    expect(screen.getByText('Never run')).toBeInTheDocument();
  });

  it('renders a translated status label instead of the raw enum', () => {
    render(<LastRunStatus status="queued" />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.queryByText('queued')).not.toBeInTheDocument();
  });

  it('names the glyph-only statuses for screen readers', () => {
    // `succeeded`/`failed` collapse to an icon, so the label has to live on aria-label.
    render(<LastRunStatus status="failed" />);
    expect(screen.getByLabelText('Failed')).toBeInTheDocument();
  });

  it('spells "canceled" the en-GB way', () => {
    render(<LastRunStatus status="canceled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('gives the enabled switch an accessible name', () => {
    render(<WorkflowEnabledSwitch id="wf-1" enabled />);
    expect(screen.getByRole('switch', { name: 'Enabled' })).toBeInTheDocument();
  });

  it('renders French copy under fr-FR', () => {
    const { unmount } = render(<LastRunStatus />, { locale: 'fr-FR' });
    expect(screen.getByText('Jamais exécuté')).toBeInTheDocument();
    unmount();

    render(<LastRunStatus status="running" />, { locale: 'fr-FR' });
    expect(screen.getByText('En cours')).toBeInTheDocument();
  });
});
