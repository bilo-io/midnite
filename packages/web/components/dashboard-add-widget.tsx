'use client';

import { useMemo, useState } from 'react';
import { useDashboardTabs, widgetsKey } from '@/lib/dashboard-tabs';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_WIDGETS,
  groupWidgetCatalog,
  newInstance,
  widgetCatalog,
  type WidgetInstance,
} from '@/lib/dashboard-widgets';
import { WidgetPickerMenu } from '@/components/widget-picker-menu';

/**
 * Header "+" that opens the full widget catalogue, grouped into category sections
 * with a search box that filters by title and description. Widgets already on the
 * active board show greyed-out (can't add twice); the rest add live. Shares the
 * enabled-widgets list with the grid purely through localStorage — the
 * `useLocalStorage` hook broadcasts same-tab writes, so adding here updates the
 * grid live without any shared parent/context.
 */
export function DashboardAddWidget() {
  // Add to whichever dashboard tab is active.
  const { activeId } = useDashboardTabs();
  const [widgets, setWidgets] = useLocalStorage<WidgetInstance[]>(widgetsKey(activeId), DEFAULT_WIDGETS);
  const [query, setQuery] = useState('');

  const groups = useMemo(
    () => groupWidgetCatalog(widgetCatalog(widgets), query),
    [widgets, query],
  );

  return (
    <WidgetPickerMenu
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      onAdd={(type: WidgetInstance['type']) => setWidgets((prev) => [...prev, newInstance(type)])}
      triggerLabel="Add widget"
      searchLabel="Search widgets"
      addedTitle="Already on this dashboard"
    />
  );
}
