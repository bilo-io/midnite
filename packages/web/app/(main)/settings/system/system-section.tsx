'use client';

import { Bell } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { EnvironmentAccordion } from './environment-accordion';
import { RealtimeAccordion } from './realtime-accordion';
import { UpdatesAccordion } from './updates-accordion';
import { SetupStatusPanel } from './setup-status-panel';

export function SystemSection() {
  const t = useTranslations('settings');
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  // Enabling notifications prompts for the browser's Notification permission;
  // if the user denies it, we flip the toggle back off so it reflects reality.
  const toggleNotify = (on: boolean) => {
    if (on && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setSettings((prev) => ({ ...prev, notifyTaskUpdates: true }));
      } else if (Notification.permission === 'denied') {
        // Can't re-prompt once denied — keep it off; the hint explains why.
        setSettings((prev) => ({ ...prev, notifyTaskUpdates: false }));
      } else {
        void Notification.requestPermission().then((perm) =>
          setSettings((prev) => ({ ...prev, notifyTaskUpdates: perm === 'granted' })),
        );
      }
      return;
    }
    setSettings((prev) => ({ ...prev, notifyTaskUpdates: on }));
  };
  const notifyDenied =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'denied';

  return (
    <div className="space-y-4">
      <SetupStatusPanel />

      <EnvironmentAccordion />

      <Accordion title={t('system.notifications.title')} icon={<Bell className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('system.notifications.taskUpdates')}</p>
              <p className="text-xs text-muted-foreground">
                {t('system.notifications.taskUpdatesDescription')}
                {notifyDenied ? ` ${t('system.notifications.blockedHint')}` : ''}
              </p>
            </div>
            <Switch
              checked={settings.notifyTaskUpdates}
              onCheckedChange={toggleNotify}
              disabled={notifyDenied}
              aria-label={t('system.notifications.notifyAria')}
            />
          </div>
        </div>
      </Accordion>

      <RealtimeAccordion />

      <UpdatesAccordion />
    </div>
  );
}
