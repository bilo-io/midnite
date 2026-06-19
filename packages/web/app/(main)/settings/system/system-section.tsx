'use client';

import { Bell, Blocks } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { FEATURES, isFeatureEnabled, type FeatureKey } from '@/lib/features';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

export function SystemSection() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const setFeatureEnabled = (key: FeatureKey, on: boolean) =>
    setSettings((prev) => ({ ...prev, features: { ...prev.features, [key]: on } }));

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
      <Accordion
        title="Features"
        icon={<Blocks className="h-3.5 w-3.5" />}
        count={FEATURES.length}
        defaultOpen
      >
        <div className="p-5">
          <p className="pb-2 text-xs text-muted-foreground/70">
            Turn sections of the app on or off. Disabled features are hidden from the sidebar; if
            you open one directly you&apos;ll be prompted to re-enable it here.
          </p>
          <div className="divide-y divide-border/50">
            {FEATURES.map((f) => {
              const Icon = f.Icon;
              return (
                <div key={f.key} className="flex items-start justify-between gap-6 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card/60 text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{f.label}</p>
                      <p className="text-xs text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isFeatureEnabled(settings.features, f.key)}
                    onCheckedChange={(on) => setFeatureEnabled(f.key, on)}
                    aria-label={`Enable ${f.label}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </Accordion>

      <Accordion title="Notifications" icon={<Bell className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Task updates</p>
              <p className="text-xs text-muted-foreground">
                Get a desktop notification when a task needs your input or finishes. Works in the
                browser and the desktop app.
                {notifyDenied
                  ? ' Notifications are blocked in your browser — allow them in site settings to enable this.'
                  : ''}
              </p>
            </div>
            <Switch
              checked={settings.notifyTaskUpdates}
              onCheckedChange={toggleNotify}
              disabled={notifyDenied}
              aria-label="Notify on task updates"
            />
          </div>
        </div>
      </Accordion>
    </div>
  );
}
