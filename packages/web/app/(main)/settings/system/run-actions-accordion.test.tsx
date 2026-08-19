import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '../../../../vitest.render-intl';

import { SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { RunActionsAccordion } from './run-actions-accordion';

function readStoredMode(): string | undefined {
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Partial<AppSettings>).projectRunMode : undefined;
}

/** Open the (closed-by-default) accordion body. */
function open() {
  fireEvent.click(screen.getByRole('button', { name: /run actions/i }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe('RunActionsAccordion', () => {
  it('defaults to terminal mode', () => {
    render(<RunActionsAccordion />);
    open();
    expect(screen.getByRole('button', { name: 'Terminal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('persists the chosen mode', () => {
    render(<RunActionsAccordion />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Background' }));
    expect(readStoredMode()).toBe('background');
  });
});

describe('RunActionsAccordion — tmux caveat', () => {
  it('hides the warning in terminal mode', () => {
    render(<RunActionsAccordion />);
    open();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('warns that background runs outlive Midnite under tmux', () => {
    render(<RunActionsAccordion />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Background' }));

    const note = screen.getByRole('note');
    expect(note).toHaveTextContent(/outlive Midnite under tmux/i);
    // The caveat is only true for the tmux backend — the copy must say so rather
    // than flatly contradicting the "dies with Midnite" promise.
    expect(note).toHaveTextContent(/pty/);
    expect(note).toHaveTextContent(/tmux/);
  });

  it('gives commands to find and stop stray sessions', () => {
    render(<RunActionsAccordion />);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Background' }));

    const note = screen.getByRole('note');
    // Background runs spawn as `project-run-<uuid>`, which the tmux spawner
    // prefixes with `midnite-` — the commands must match that real naming.
    expect(note).toHaveTextContent('tmux ls | grep midnite-project-run');
    expect(note).toHaveTextContent('tmux kill-session -t midnite-project-run-<id>');
    expect(note).toHaveTextContent(/xargs -n1 tmux kill-session -t/);
  });
});
