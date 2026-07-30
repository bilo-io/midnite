import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl as render } from '../vitest.render-intl';

import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help';

describe('KeyboardShortcutsHelp', () => {
  it('renders nothing when closed', () => {
    render(<KeyboardShortcutsHelp open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('lists the shortcut groups when open', () => {
    render(<KeyboardShortcutsHelp open onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Open command palette')).toBeInTheDocument();
    expect(screen.getByText('Go to Board')).toBeInTheDocument();
  });

  // Phase 82 Theme D — renders under fr-FR.
  it('renders in fr-FR', () => {
    render(<KeyboardShortcutsHelp open onClose={vi.fn()} />, { locale: 'fr-FR' });
    expect(screen.getByRole('dialog', { name: 'Raccourcis clavier' })).toBeInTheDocument();
    expect(screen.getByText('Ouvrir la palette de commandes')).toBeInTheDocument();
    expect(screen.getByText('Général')).toBeInTheDocument();
  });
});
