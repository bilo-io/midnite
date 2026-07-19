'use client';

import type { ReactNode } from 'react';
import type { AccentId, AccentValue, BackgroundPattern } from '@midnite/shared';
import { ACCENT_OPTIONS, BACKGROUND_PATTERN_OPTIONS } from '@midnite/shell';
import { Card, CardContent, CardHeader, CardTitle, Select, Switch, ThemeToggle } from '@midnite/ui';
import { BRAND_ACCENT, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';

/**
 * The operator console's minimal Settings page (Phase 73 Theme E). Appearance
 * (theme · accent · background) + the screen-lock toggle, persisted to the SAME
 * `localStorage` key the shell appearance runtime reads (`SETTINGS_STORAGE_KEY`),
 * so `AppearanceEffects` applies changes live. Deliberately small — the full
 * settings surface is web's.
 */
const ACCENT_SELECT: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'brand', label: 'Brand' },
  ...ACCENT_OPTIONS.map((o) => ({ value: o.id, label: o.label })),
];

export default function SettingsPage() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  const accentValue = settings.accent.kind === 'solid' ? settings.accent.swatch : 'brand';
  const setAccent = (next: string) => {
    const accent: AccentValue = next === 'brand' ? BRAND_ACCENT : { kind: 'solid', swatch: next as AccentId };
    setSettings((prev) => ({ ...prev, accent }));
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <SettingRow label="Theme" hint="Light, dark, or follow the system.">
            <ThemeToggle expanded />
          </SettingRow>

          <SettingRow label="Accent" hint="The primary accent colour.">
            <div className="w-48">
              <Select options={ACCENT_SELECT} value={accentValue} onChange={setAccent} />
            </div>
          </SettingRow>

          <SettingRow label="Background" hint="The decorative backdrop pattern.">
            <div className="w-48">
              <Select
                options={BACKGROUND_PATTERN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={settings.backgroundPattern}
                onChange={(next: BackgroundPattern) =>
                  setSettings((prev) => ({ ...prev, backgroundPattern: next }))
                }
              />
            </div>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingRow label="Screen lock" hint="Lock the console after a period of inactivity.">
            <Switch
              checked={settings.screenLock}
              onCheckedChange={(screenLock) => setSettings((prev) => ({ ...prev, screenLock }))}
              aria-label="Screen lock"
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  );
}
