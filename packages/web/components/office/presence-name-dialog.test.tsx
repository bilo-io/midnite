import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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
});
