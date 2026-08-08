import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { LayoutDashboard } from 'lucide-react';
import { renderWithIntl as render } from '@/vitest.render-intl';
import { WidgetPickerMenu, type WidgetPickerGroup } from './widget-picker-menu';

const GROUPS: WidgetPickerGroup<'clock'>[] = [
  {
    category: 'time',
    label: 'Time',
    items: [
      { type: 'clock', label: 'Clock', description: 'The current time', icon: LayoutDashboard, added: false },
    ],
  },
];

/** Mirrors how Dashboard/Ops mount the picker: query lives in the parent. */
function Harness() {
  const [query, setQuery] = useState('');
  return (
    <WidgetPickerMenu
      groups={GROUPS}
      query={query}
      onQueryChange={setQuery}
      onAdd={() => {}}
      triggerLabel="Add widget"
      searchLabel="Search widgets"
      addedTitle="Already on this dashboard"
    />
  );
}

describe('WidgetPickerMenu', () => {
  it('focuses the search box on open so you can type straight away', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));

    const search = await screen.findByRole('textbox', { name: 'Search widgets' });
    await waitFor(() => expect(search).toHaveFocus());

    // Typing without clicking first lands in the search box.
    fireEvent.change(document.activeElement as HTMLInputElement, { target: { value: 'clo' } });
    expect(search).toHaveValue('clo');
  });
});
