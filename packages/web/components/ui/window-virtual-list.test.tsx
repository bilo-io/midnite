import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { WindowVirtualList } from './window-virtual-list';

function rows(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `row-${i}`);
}

describe('WindowVirtualList', () => {
  it('renders every row plainly at/under the threshold (no windowing overhead)', () => {
    render(
      <WindowVirtualList
        items={rows(5)}
        threshold={50}
        rowKey={(r) => r}
        renderRow={(r) => <div>{r}</div>}
      />,
    );
    // All 5 rows present; none are absolutely positioned (plain flow layout).
    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`row-${i}`)).toBeInTheDocument();
    }
    expect(screen.getByText('row-0').closest('[style*="position: absolute"]')).toBeNull();
  });

  it('applies a row gap as flex row-gap in the plain path', () => {
    const { container } = render(
      <WindowVirtualList
        items={rows(3)}
        gap={8}
        threshold={50}
        rowKey={(r) => r}
        renderRow={(r) => <div>{r}</div>}
      />,
    );
    const wrapper = container.querySelector('div > div')?.parentElement;
    // The plain container carries the flex column + rowGap.
    const flex = container.querySelector('[style*="row-gap"]');
    expect(flex).not.toBeNull();
    expect(wrapper).toBeTruthy();
  });

  it('renders exactly the items given (stable keys, no duplication)', () => {
    render(
      <WindowVirtualList
        items={rows(4)}
        threshold={50}
        rowKey={(r) => r}
        renderRow={(r) => <div>{r}</div>}
      />,
    );
    expect(screen.getAllByText(/^row-\d+$/)).toHaveLength(4);
  });
});
