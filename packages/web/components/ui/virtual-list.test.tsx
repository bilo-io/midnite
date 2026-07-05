import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { VirtualList } from './virtual-list';

afterEach(cleanup);

const items = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, label: `Row ${i}` }));

// jsdom has no layout/scroll, so real windowing is proven by the Playwright
// node-count e2e. Here we cover the threshold branch: at/under the threshold the
// list renders every row plainly (no measurement needed).
it('renders every row plainly at/under the threshold', () => {
  render(
    <VirtualList
      items={items(10)}
      rowKey={(r) => r.id}
      threshold={50}
      renderRow={(r) => <div>{r.label}</div>}
    />,
  );
  expect(screen.getByText('Row 0')).toBeInTheDocument();
  expect(screen.getByText('Row 9')).toBeInTheDocument();
  expect(screen.getAllByText(/^Row /)).toHaveLength(10);
});

it('applies rowKey (no duplicate-key collisions) and renders in order', () => {
  render(
    <VirtualList items={items(3)} rowKey={(r) => r.id} renderRow={(r) => <div>{r.label}</div>} />,
  );
  const rows = screen.getAllByText(/^Row /).map((el) => el.textContent);
  expect(rows).toEqual(['Row 0', 'Row 1', 'Row 2']);
});

it('renders an empty container for no items', () => {
  const renderRow = vi.fn();
  render(<VirtualList items={[]} rowKey={() => 'x'} renderRow={renderRow} />);
  expect(renderRow).not.toHaveBeenCalled();
});
