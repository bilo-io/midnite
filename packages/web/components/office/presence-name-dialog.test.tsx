import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';

import { renderWithIntl as render } from '@/vitest.render-intl';
import { PresenceNameDialog } from './presence-name-dialog';

afterEach(cleanup);

describe('PresenceNameDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PresenceNameDialog open={false} defaultName="Explorer 42" onSubmit={() => {}} onSkip={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('submits the typed name', () => {
    const onSubmit = vi.fn();
    render(<PresenceNameDialog open defaultName="Explorer 42" onSubmit={onSubmit} onSkip={() => {}} />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onSubmit).toHaveBeenCalledWith('Ada');
  });

  it('falls back to the default name when submitted blank', () => {
    const onSubmit = vi.fn();
    render(<PresenceNameDialog open defaultName="Explorer 42" onSubmit={onSubmit} onSkip={() => {}} />);
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));
    expect(onSubmit).toHaveBeenCalledWith('Explorer 42');
  });

  it('skips via the "Use default" button', () => {
    const onSkip = vi.fn();
    render(<PresenceNameDialog open defaultName="Explorer 42" onSubmit={() => {}} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use default' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('renders the French copy under fr-FR (Phase 82 E)', () => {
    render(
      <PresenceNameDialog open defaultName="Explorer 42" onSubmit={() => {}} onSkip={() => {}} />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByRole('heading', { name: 'Rejoindre le bureau' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nom affiché')).toBeInTheDocument();
  });
});
