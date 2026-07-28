'use client';

import { DownloadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { UPDATE_CHANNELS, type UpdateChannel } from '@midnite/shared';

import { Accordion } from '@/components/ui/accordion';
import { useUpdate } from '@/components/update/update-provider';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

/**
 * Phase 71 Theme H — the app-update channel. `stable` follows tagged releases;
 * `beta` opts into pre-release builds. The choice is a synced preference (Phase
 * 43): the web poll fetches the channel's manifest (`version.json` vs
 * `version.beta.json`) and, inside the desktop shell, the electron-updater channel
 * follows it. Switching re-checks immediately, so opting into beta surfaces a
 * newer build without a reload.
 */
export function UpdatesAccordion() {
  const t = useTranslations('settings');
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const channel = settings.updateChannel ?? DEFAULT_SETTINGS.updateChannel;
  const { isDesktop, available, latest, error } = useUpdate();

  const onChange = (value: UpdateChannel) =>
    setSettings((prev) => ({ ...prev, updateChannel: value }));

  const CHANNEL_LABEL: Record<UpdateChannel, string> = {
    stable: t('system.updates.channelStable'),
    beta: t('system.updates.channelBeta'),
  };

  return (
    <Accordion title={t('system.updates.title')} icon={<DownloadCloud className="h-3.5 w-3.5" />}>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('system.updates.releaseChannel')}</p>
            <p className="text-xs text-muted-foreground">
              {t.rich('system.updates.channelDescription', {
                strong: (chunks) => (
                  <span className="font-medium text-foreground">{chunks}</span>
                ),
              })}
            </p>
          </div>
          <select
            aria-label={t('system.updates.releaseChannel')}
            className={inputClass}
            value={channel}
            onChange={(e) => onChange(e.target.value as UpdateChannel)}
          >
            {UPDATE_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CHANNEL_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop updater status. The banner deliberately stays hidden when a check
            fails with no known version (an offline app must not nag) — which is how a
            feed misconfiguration once went unnoticed release after release, so the
            real reason always surfaces here. */}
        {isDesktop && (
          <div className="space-y-1 border-t border-border/60 pt-4">
            <p className="text-sm font-medium">{t('system.updates.status')}</p>
            <p className={cn('text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error
                ? t('system.updates.statusFailed', { error })
                : available && latest
                  ? t('system.updates.statusAvailable', { version: latest })
                  : t('system.updates.statusUpToDate')}
            </p>
          </div>
        )}
      </div>
    </Accordion>
  );
}
