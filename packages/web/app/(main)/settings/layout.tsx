'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/page-header';
import { SettingsPane } from './settings-pane';
import { SettingsSidebar } from './settings-sidebar';

/**
 * The settings hub shell: one header plus a category sidebar, with each
 * category rendering into the content column. Categories are real routes
 * (`/settings`, `/settings/agents`, …) so they're deep-linkable.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('settings');
  return (
    <div className="flex min-h-[calc(100dvh_-_var(--titlebar-h,0px))] flex-col">
      <PageHeader
        title={t('hub.title')}
        icon="Settings"
        description={t('hub.description')}
      />
      <div className="container flex flex-col gap-8 py-2 md:flex-row md:items-start" data-tour="settings">
        <SettingsSidebar />
        <SettingsPane>{children}</SettingsPane>
      </div>
    </div>
  );
}
