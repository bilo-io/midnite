import { fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { describe, expect, it, vi } from 'vitest';
import { StatusSelect } from './status-select';

/** Open the dropdown and read back the option labels it offers. */
function openOptions(): (string | null)[] {
  fireEvent.click(screen.getByRole('button'));
  return screen.getAllByRole('option').map((o) => o.textContent);
}

describe('StatusSelect', () => {
  it('offers "In progress" as a target, so a task can be started from the header', () => {
    render(<StatusSelect status="todo" onChange={vi.fn()} />);
    expect(openOptions()).toContain('In progress');
  });

  it('offers "In progress" from waiting too (a parked task can be resumed)', () => {
    render(<StatusSelect status="waiting" onChange={vi.fn()} />);
    expect(openOptions()).toContain('In progress');
  });

  it('reports the picked status to the caller', () => {
    const onChange = vi.fn();
    render(<StatusSelect status="todo" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('option', { name: /In progress/ }));

    expect(onChange).toHaveBeenCalledWith('wip');
  });

  it('offers only legal targets — never an edge the state machine rejects', () => {
    render(<StatusSelect status="backlog" onChange={vi.fn()} />);
    // backlog → todo | wip | abandoned; `waiting` and `done` are not edges.
    const options = openOptions();
    expect(options).toContain('In progress');
    expect(options).not.toContain('Waiting');
    expect(options).not.toContain('Done');
  });

  it('renders a terminal status as a static label, not a dropdown', () => {
    render(<StatusSelect status="done" onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Done')).toBeTruthy();
  });
});
