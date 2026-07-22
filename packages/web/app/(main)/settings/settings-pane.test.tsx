import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';

import { SettingsPane } from './settings-pane';

let pathname = '/settings';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

function Counter() {
  const [n, setN] = useState(0);
  return (
    <button type="button" onClick={() => setN((v) => v + 1)}>
      count:{n}
    </button>
  );
}

describe('SettingsPane', () => {
  it('re-reveals (remounts) only when the category changes', () => {
    pathname = '/settings';
    const { rerender, container } = render(
      <SettingsPane>
        <Counter />
      </SettingsPane>,
    );
    expect(container.querySelector('.settings-pane-reveal')).not.toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('count:1')).toBeInTheDocument();

    // Same category re-render (e.g. parent state change) → no remount.
    rerender(
      <SettingsPane>
        <Counter />
      </SettingsPane>,
    );
    expect(screen.getByText('count:1')).toBeInTheDocument();

    // Category switch → the pane (and only the pane) remounts, replaying its reveal.
    pathname = '/settings/agents';
    rerender(
      <SettingsPane>
        <Counter />
      </SettingsPane>,
    );
    expect(screen.getByText('count:0')).toBeInTheDocument();
  });
});
