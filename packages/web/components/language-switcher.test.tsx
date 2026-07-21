import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher (Phase 79 C)', () => {
  it('expanded: shows the current language + locale code, and an accessible trigger', () => {
    render(<LanguageSwitcher expanded locale="de-DE" onSelect={() => {}} />);
    const trigger = screen.getByRole('button', { name: /Language: German/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(within(trigger).getByText('Deutsch (de-DE)')).toBeInTheDocument();
  });

  it('collapsed: shows the label only as a tooltip (icon-only rail)', () => {
    render(<LanguageSwitcher expanded={false} locale="en-GB" onSelect={() => {}} />);
    // Trigger still carries the accessible name…
    expect(screen.getByRole('button', { name: /Language: English/i })).toBeInTheDocument();
    // …and the visible label lives in a tooltip, not a plain span.
    expect(screen.getByRole('tooltip')).toHaveTextContent('English (UK) (en-GB)');
  });

  it('opens a listbox of all supported locales, marking the active one', () => {
    render(<LanguageSwitcher expanded locale="de-DE" onSelect={() => {}} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Language:/i }));

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    const active = screen.getByRole('option', { selected: true });
    expect(active).toHaveTextContent('Deutsch');
  });

  it('selecting a language calls onSelect with the locale code and closes', () => {
    const onSelect = vi.fn();
    render(<LanguageSwitcher expanded locale="en-GB" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Language:/i }));
    fireEvent.click(screen.getByRole('option', { name: /Français/i }));

    expect(onSelect).toHaveBeenCalledWith('fr-FR');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<LanguageSwitcher expanded locale="en-GB" onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Language:/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
