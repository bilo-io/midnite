'use client';

import { useEffect, useState } from 'react';
import { Activity, Clock, Cpu, Lock, PanelLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PasscodeSetupDialog } from '@/components/passcode-pad';
import { getAgentsConfig, updatePrimaryAgent } from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  AGENT_POOL_MAX,
  AGENT_POOL_MIN,
  DEFAULT_SETTINGS,
  HEARTBEAT_DEFAULT_H,
  HEARTBEAT_PRESETS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  INACTIVITY_PRESETS_S,
  nearestInactivityPresetIndex,
  PASSCODE_LENGTH,
  PASSCODE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  formatHeartbeatInterval,
  type AppSettings,
  type NavMode,
} from '@/lib/app-settings';
import { cn } from '@/lib/utils';

const NAV_MODE_OPTIONS: { value: NavMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Collapsed; expands on hover' },
  { value: 'expanded', label: 'Locked open', hint: 'Always expanded' },
  { value: 'collapsed', label: 'Locked closed', hint: 'Always the icon bar' },
];

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

export function SettingsView() {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const navMode = settings.navMode ?? DEFAULT_SETTINGS.navMode;
  const setNavMode = (mode: NavMode) => setSettings((prev) => ({ ...prev, navMode: mode }));

  const poolSize = Math.min(AGENT_POOL_MAX, Math.max(AGENT_POOL_MIN, settings.agentPoolSize));
  const setPoolSize = (n: number) =>
    setSettings((prev) => ({
      ...prev,
      agentPoolSize: Math.min(AGENT_POOL_MAX, Math.max(AGENT_POOL_MIN, n)),
    }));

  const idleTimeout = Math.min(
    INACTIVITY_MAX_S,
    Math.max(INACTIVITY_MIN_S, settings.inactivityTimeoutS),
  );
  const setIdleTimeout = (n: number) =>
    setSettings((prev) => ({
      ...prev,
      inactivityTimeoutS: Math.min(INACTIVITY_MAX_S, Math.max(INACTIVITY_MIN_S, n)),
    }));

  // The heartbeat cadence lives server-side (on the primary agent); the prompt
  // itself is configured on the Agents page. Load on mount, save on change.
  const [heartbeatH, setHeartbeatH] = useState<number | null>(null);
  useEffect(() => {
    getAgentsConfig()
      .then((c) => setHeartbeatH(c.primary.heartbeatIntervalH))
      .catch(() => setHeartbeatH(HEARTBEAT_DEFAULT_H));
  }, []);
  const heartbeat = heartbeatH ?? HEARTBEAT_DEFAULT_H;
  const setHeartbeat = (n: number) => {
    setHeartbeatH(n);
    void updatePrimaryAgent({ heartbeatIntervalH: n }).catch(() => {});
  };

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
    <div className="container max-w-3xl space-y-6 py-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5" />
            Agent pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Parallel agents</p>
              <p className="text-xs text-muted-foreground">
                How many Claude Code sessions may run at once. Extra tasks queue until a slot
                frees up.
              </p>
            </div>
            <div
              className={cn(
                'flex h-9 min-w-[3.5rem] items-center justify-center rounded-md border border-border/60 bg-card/60 px-3 text-lg font-semibold tabular-nums transition-opacity',
                hydrated ? 'opacity-100' : 'opacity-0',
              )}
            >
              {poolSize}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-4 text-right text-xs text-muted-foreground tabular-nums">
              {AGENT_POOL_MIN}
            </span>
            <input
              type="range"
              min={AGENT_POOL_MIN}
              max={AGENT_POOL_MAX}
              step={1}
              value={poolSize}
              onChange={(e) => setPoolSize(Number(e.target.value))}
              aria-label="Parallel agents"
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-foreground"
            />
            <span className="w-6 text-xs text-muted-foreground tabular-nums">{AGENT_POOL_MAX}</span>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Default {DEFAULT_SETTINGS.agentPoolSize} · maximum {AGENT_POOL_MAX}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PanelLeft className="h-3.5 w-3.5" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Side navigation</p>
              <p className="text-xs text-muted-foreground">
                Lock the nav open or closed, or let it stay collapsed and expand on hover.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-label="Side navigation"
              className={cn(
                'flex shrink-0 rounded-md border border-border/60 bg-card/60 p-0.5 transition-opacity',
                hydrated ? 'opacity-100' : 'opacity-0',
              )}
            >
              {NAV_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={navMode === opt.value}
                  onClick={() => setNavMode(opt.value)}
                  title={opt.hint}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    navMode === opt.value
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70">
            {NAV_MODE_OPTIONS.find((o) => o.value === navMode)?.hint}.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Heartbeat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Interval</p>
              <p className="text-xs text-muted-foreground">
                How often your primary agent&apos;s heartbeat prompt runs. Configure the prompt
                itself on the Agents page.
              </p>
            </div>
            <select
              value={heartbeat}
              onChange={(e) => setHeartbeat(Number(e.target.value))}
              aria-label="Heartbeat interval"
              className={cn(
                'h-9 rounded-md border border-input bg-background px-3 text-sm transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                heartbeatH !== null ? 'opacity-100' : 'opacity-0',
              )}
            >
              {HEARTBEAT_PRESETS.some((p) => p.hours === heartbeat) ? null : (
                <option value={heartbeat}>{formatHeartbeatInterval(heartbeat)}</option>
              )}
              {HEARTBEAT_PRESETS.map((p) => (
                <option key={p.hours} value={p.hours}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Default {formatHeartbeatInterval(HEARTBEAT_DEFAULT_H).toLowerCase()} · from every hour
            up to once a month.
          </p>
        </CardContent>
      </Card>

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSetup('change')}
              >
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
