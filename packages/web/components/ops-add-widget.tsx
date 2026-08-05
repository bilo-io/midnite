'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useOpsWidgetLabels } from '@/lib/ops-widget-labels';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_OPS_WIDGETS,
  groupOpsWidgetCatalog,
  opsWidgetCatalog,
  OPS_WIDGETS_STORAGE_KEY,
  type OpsWidgetInstance,
  type OpsWidgetType,
} from '@/lib/ops-widgets';
import { WidgetPickerMenu } from '@/components/widget-picker-menu';

/**
 * Header "+" for the Ops board — the dashboard's add-widget picker mirrored onto
 * the ops catalogue. Opens the full ops widget catalogue grouped into category
 * sections with a search box; widgets already on the board show greyed-out. Shares
 * the enabled-widgets list with {@link OpsGrid} purely through localStorage (the
 * `useLocalStorage` hook broadcasts same-tab writes), so adding here updates the
 * grid live without any shared parent/context. Kept separate from the dashboard
 * picker so the two boards' options stay mutually exclusive.
 */
export function OpsAddWidget() {
  const t = useTranslations('ops');
  const widgetLabels = useOpsWidgetLabels();
  const [widgets, setWidgets] = useLocalStorage<OpsWidgetInstance[]>(
    OPS_WIDGETS_STORAGE_KEY,
    DEFAULT_OPS_WIDGETS,
  );
  const [query, setQuery] = useState('');

  // Localise the registry's labels/descriptions BEFORE filtering, so search matches what
  // the user actually reads; category headers localise after — the same ordering the
  // dashboard picker uses.
  const groups = useMemo(() => {
    const entries = opsWidgetCatalog(widgets).map((entry) => ({
      ...entry,
      label: widgetLabels.label(entry.type),
      description: widgetLabels.description(entry.type),
    }));
    return groupOpsWidgetCatalog(entries, query).map((group) => ({
      ...group,
      label: widgetLabels.category(group.category),
    }));
  }, [widgets, query, widgetLabels]);

  const add = (type: OpsWidgetType) =>
    setWidgets((prev) => (prev.some((w) => w.type === type) ? prev : [...prev, { type }]));

  return (
    <WidgetPickerMenu
      groups={groups}
      query={query}
      onQueryChange={setQuery}
      onAdd={add}
      triggerLabel={t('picker.add')}
      searchLabel={t('picker.search')}
      addedTitle={t('picker.added')}
    />
  );
}
