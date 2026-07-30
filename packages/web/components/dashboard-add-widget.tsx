'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dashboard');
  // Add to whichever dashboard tab is active.
  const { activeId } = useDashboardTabs();
  const [widgets, setWidgets] = useLocalStorage<WidgetInstance[]>(widgetsKey(activeId), DEFAULT_WIDGETS);
  const [query, setQuery] = useState('');

  // Localise the registry's labels/descriptions BEFORE filtering, so search
  // matches what the user actually reads; category headers localise after.
  const groups = useMemo(() => {
    const entries = widgetCatalog(widgets).map((entry) => ({
      ...entry,
      label: t(`catalog.${entry.type}.label`),
      description: t(`catalog.${entry.type}.description`),
    }));
    return groupWidgetCatalog(entries, query).map((group) => ({
      ...group,
      label: t(`categories.${group.category}`),
    }));
  }, [widgets, query, t]);

  return (
    <WidgetPickerMenu
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      onAdd={(type: WidgetInstance['type']) => setWidgets((prev) => [...prev, newInstance(type)])}
      triggerLabel={t('picker.add')}
      searchLabel={t('picker.search')}
      addedTitle={t('picker.added')}
    />
  );
}
