'use client';

import { Clock, Cpu } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  AGENT_POOL_MAX,
  AGENT_POOL_MIN,
  DEFAULT_SETTINGS,
  INACTIVITY_MAX_S,
  INACTIVITY_MIN_S,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}

export function SettingsView() {
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

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
              min={INACTIVITY_MIN_S}
              max={INACTIVITY_MAX_S}
              step={5}
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(Number(e.target.value))}
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
    </div>
  );
}
