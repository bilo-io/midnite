'use client';

import { useState } from 'react';
import { Clock, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PasscodeSetupDialog } from '@/components/passcode-pad';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  CYCLE_DEFAULT_S,
  CYCLE_MAX_S,
  CYCLE_MIN_S,
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  INACTIVITY_PRESETS_S,
  nearestInactivityPresetIndex,
  PASSCODE_LENGTH,
  PASSCODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export function ScreenLockSection() {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const idleTimeout = Math.min(
    INACTIVITY_MAX_S,
    Math.max(INACTIVITY_MIN_S, settings.inactivityTimeoutS),
  );
  const setIdleTimeout = (n: number) =>
    setSettings((prev) => ({
      ...prev,
      inactivityTimeoutS: Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, n)),
    }));

  const cycleDuration = Math.min(CYCLE_MAX_S, Math.max(CYCLE_MIN_S, settings.cycleDurationS));
  const setCycleDuration = (n: number) =>
    setSettings((prev) => ({
      ...prev,
      cycleDurationS: Math.min(CYCLE_MAX_S, Math.max(CYCLE_MIN_S, n)),
    }));

  const [passcode, setPasscode] = useLocalStorage<string | null>(PASSCODE_STORAGE_KEY, null);
  // `enable` defers turning the requirement on until a passcode is confirmed;
  // `change` just replaces an existing one.
  const [setup, setSetup] = useState<'enable' | 'change' | null>(null);
  const hasPasscode = !!passcode;

  const setRequirePasscode = (on: boolean) =>
    setSettings((prev) => ({ ...prev, requirePasscode: on }));

  const toggleRequirePasscode = (on: boolean) => {
    if (on && !hasPasscode) setSetup('enable');
    else setRequirePasscode(on);
  };

  const setOnlyWhenLocked = (on: boolean) =>
    setSettings((prev) => ({ ...prev, passcodeOnlyWhenLocked: on }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Screensaver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Inactivity timeout</p>
              <p className="text-xs text-muted-foreground">
                How long without any input before the screensaver appears. Any activity wakes it.
              </p>
            </div>
            <div
              className={cn(
                'flex h-9 min-w-[3.5rem] items-center justify-center rounded-md border border-border/60 bg-card/60 px-3 text-lg font-semibold tabular-nums transition-opacity',
                hydrated ? 'opacity-100' : 'opacity-0',
              )}
            >
              {formatDuration(idleTimeout)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
              {formatDuration(INACTIVITY_MIN_S)}
            </span>
            <input
              type="range"
              min={0}
              max={INACTIVITY_PRESETS_S.length - 1}
              step={1}
              value={nearestInactivityPresetIndex(idleTimeout)}
              onChange={(e) => setIdleTimeout(INACTIVITY_PRESETS_S[Number(e.target.value)]!)}
              aria-label="Inactivity timeout"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-foreground"
            />
            <span className="w-8 text-xs text-muted-foreground tabular-nums">
              {formatDuration(INACTIVITY_MAX_S)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Default {formatDuration(DEFAULT_SETTINGS.inactivityTimeoutS)} · range{' '}
            {formatDuration(INACTIVITY_MIN_S)}–{formatDuration(INACTIVITY_MAX_S)}.
          </p>

          <div className="space-y-4 border-t border-border/60 pt-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium">Cycle duration</p>
                <p className="text-xs text-muted-foreground">
                  How long each phrase is shown before the next is typed out — on the screensaver
                  and the home screen.
                </p>
              </div>
              <div
                className={cn(
                  'flex h-9 min-w-[3.5rem] items-center justify-center rounded-md border border-border/60 bg-card/60 px-3 text-lg font-semibold tabular-nums transition-opacity',
                  hydrated ? 'opacity-100' : 'opacity-0',
                )}
              >
                {cycleDuration}s
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-8 text-right text-xs text-muted-foreground tabular-nums">
                {CYCLE_MIN_S}s
              </span>
              <input
                type="range"
                min={CYCLE_MIN_S}
                max={CYCLE_MAX_S}
                step={1}
                value={cycleDuration}
                onChange={(e) => setCycleDuration(Number(e.target.value))}
                aria-label="Cycle duration"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-foreground"
              />
              <span className="w-8 text-xs text-muted-foreground tabular-nums">{CYCLE_MAX_S}s</span>
            </div>

            <p className="text-xs text-muted-foreground/70">
              Default {CYCLE_DEFAULT_S}s · range {CYCLE_MIN_S}–{CYCLE_MAX_S}s.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            Screen lock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Require passcode</p>
              <p className="text-xs text-muted-foreground">
                Ask for a {PASSCODE_LENGTH}-digit passcode to wake the screensaver. Stored only on
                this device — clear it any time if you forget it.
              </p>
            </div>
            <Switch
              checked={settings.requirePasscode}
              onCheckedChange={toggleRequirePasscode}
              aria-label="Require passcode"
            />
          </div>

          <div
            className={cn(
              'flex items-start justify-between gap-6 transition-opacity',
              settings.requirePasscode ? 'opacity-100' : 'opacity-50',
            )}
          >
            <div className="space-y-1">
              <p className="text-sm font-medium">Only when locked</p>
              <p className="text-xs text-muted-foreground">
                Skip the passcode for the idle screensaver — only ask when you lock manually with the
                power button.
              </p>
            </div>
            <Switch
              checked={settings.passcodeOnlyWhenLocked}
              onCheckedChange={setOnlyWhenLocked}
              disabled={!settings.requirePasscode}
              aria-label="Only require passcode when locked"
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2 text-xs">
              <span
                aria-hidden
                className={cn(
                  'h-2 w-2 rounded-full',
                  hasPasscode ? 'bg-[hsl(var(--status-done))]' : 'bg-muted-foreground/40',
                )}
              />
              <span className={hasPasscode ? 'text-foreground' : 'text-muted-foreground'}>
                {hasPasscode ? 'Passcode set' : 'No passcode set'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSetup('change')}>
                {hasPasscode ? 'Change' : 'Set passcode'}
              </Button>
              {hasPasscode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPasscode(null)}
                  className="text-destructive hover:text-destructive"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {setup ? (
        <PasscodeSetupDialog
          onComplete={(code) => {
            setPasscode(code);
            if (setup === 'enable') setRequirePasscode(true);
            setSetup(null);
          }}
          onCancel={() => setSetup(null)}
        />
      ) : null}
    </div>
  );
}
