import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '../vitest.render-intl';
import { LocaleTile } from './locale-tile';

describe('LocaleTile', () => {
  it('shows the translated Language label with the native language in the accessible name', () => {
    renderWithIntl(<LocaleTile locale="de-DE" onSelect={() => {}} />);
    const trigger = screen.getByRole('button', { name: /Language: Deutsch/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // The visible tile label is the word "Language" — the locale code belongs to
    // the rail's switcher, which has room for it.
    expect(within(trigger).getByText('Language')).toBeInTheDocument();
  });

  it('opens the shared option list and reports the chosen locale', () => {
    const onSelect = vi.fn();
    renderWithIntl(<LocaleTile locale="en-GB" onSelect={onSelect} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Language:/ }));

    const list = screen.getByRole('listbox');
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent('English');

    fireEvent.click(within(list).getByRole('option', { name: /Français/ }));
    expect(onSelect).toHaveBeenCalledWith('fr-FR');
    // Choosing dismisses the list.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape and on an outside pointer press', () => {
    renderWithIntl(<LocaleTile locale="en-GB" onSelect={() => {}} />);
    const trigger = screen.getByRole('button', { name: /Language:/ });

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('portals the list to the body so the sheet cannot clip it', () => {
    const { container } = renderWithIntl(<LocaleTile locale="en-GB" onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Language:/ }));
    // The sheet it renders inside is an `overflow-y-auto` scroll container, so an
    // in-flow drop-up would be cut off at its edge.
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(screen.getByRole('listbox').closest('body')).toBe(document.body);
  });
});
