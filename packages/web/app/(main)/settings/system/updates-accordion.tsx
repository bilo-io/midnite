'use client';

import { DownloadCloud } from 'lucide-react';
import { UPDATE_CHANNELS, type UpdateChannel } from '@midnite/shared';

import { Accordion } from '@/components/ui/accordion';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

const CHANNEL_LABEL: Record<UpdateChannel, string> = {
  stable: 'Stable',
  beta: 'Beta',
};

/**
 * Phase 71 Theme H — the app-update channel. `stable` follows tagged releases;
 * `beta` opts into pre-release builds. The choice is a synced preference (Phase
 * 43): the web poll fetches the channel's manifest (`version.json` vs
 * `version.beta.json`) and, inside the desktop shell, the electron-updater channel
 * follows it. Switching re-checks immediately, so opting into beta surfaces a
 * newer build without a reload.
 */
export function UpdatesAccordion() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const channel = settings.updateChannel ?? DEFAULT_SETTINGS.updateChannel;

  const onChange = (value: UpdateChannel) =>
    setSettings((prev) => ({ ...prev, updateChannel: value }));

  return (
    <Accordion title="Updates" icon={<DownloadCloud className="h-3.5 w-3.5" />}>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Release channel</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Stable</span> tracks tagged releases.{' '}
              <span className="font-medium text-foreground">Beta</span> opts into pre-release builds
              to test the newest features early — expect rough edges. The update banner and the
              desktop auto-updater both follow this choice.
            </p>
          </div>
          <select
            aria-label="Release channel"
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
      </div>
    </Accordion>
  );
}
