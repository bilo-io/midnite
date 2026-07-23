import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithIntl as render } from '@/vitest.render-intl';

import { COLUMNS } from './task-columns';
import { TapToMoveMenu } from './tap-to-move-menu';

afterEach(cleanup);

describe('TapToMoveMenu', () => {
  it('opens the menu and lists every column except the current one', () => {
    render(<TapToMoveMenu currentStatus="todo" columns={COLUMNS} onMove={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move to column' }));

    // The current column (Todo) is not offered as a target.
    expect(screen.queryByRole('button', { name: 'Todo' })).not.toBeInTheDocument();
    // The other columns are.
    expect(screen.getByRole('button', { name: 'In progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('calls onMove with the chosen status and closes', () => {
    const onMove = vi.fn();
    render(<TapToMoveMenu currentStatus="backlog" columns={COLUMNS} onMove={onMove} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move to column' }));
    fireEvent.click(screen.getByRole('button', { name: 'In progress' }));

    expect(onMove).toHaveBeenCalledWith('wip');
    // Menu closed after selecting.
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
  });
});
