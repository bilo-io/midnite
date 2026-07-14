import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { SettingsSidebar } from './settings-sidebar';

/**
 * The settings hub shell: one header plus a category sidebar, with each
 * category rendering into the content column. Categories are real routes
 * (`/settings`, `/settings/agents`, …) so they're deep-linkable.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        title="Settings"
        icon="Settings"
        description="Tune how midnite looks, locks, and runs your agents."
      />
      <div className="container flex flex-col gap-8 py-2 md:flex-row md:items-start" data-tour="settings">
        <SettingsSidebar />
        <div className="min-w-0 flex-1 md:max-w-3xl">{children}</div>
      </div>
    </div>
  );
}
