'use client';

import { AlertTriangle, Rocket } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
  type ProjectRunMode,
} from '@/lib/app-settings';

const MODES: readonly ProjectRunMode[] = ['terminal', 'background'];

/**
 * Cleanup commands for stray background runs under the tmux backend. Held as
 * constants rather than catalog entries on purpose: shell syntax isn't
 * translatable (same call as the shared expression syntax), and routing it
 * through next-intl would mangle it — ICU reads `<id>` as a rich-text tag and
 * `{session_name}` as a missing placeholder.
 *
 * A background run spawns under `project-run-<uuid>`, which the tmux spawner
 * prefixes with `midnite-` (`TMUX_PREFIX`), so every one of them matches
 * `midnite-project-run-*`.
 */
const TMUX_COMMANDS = {
  list: 'tmux ls | grep midnite-project-run',
  kill: 'tmux kill-session -t midnite-project-run-<id>',
  killAll:
    "tmux ls -F '#{session_name}' | grep '^midnite-project-run-' | xargs -n1 tmux kill-session -t",
} as const;

/**
 * Settings → System → Run actions: how the board's per-project Build/Launch
 * buttons execute a project's command — in a live terminal modal, or as a
 * background process owned by the gateway.
 *
 * Background mode carries a caveat the copy must not bury: the "dies with
 * Midnite" guarantee only holds for the default `pty` terminal backend. Under
 * `terminal.mode: "tmux"` every run is a *detached* tmux session that outlives
 * the app, so the warning below spells that out and gives the commands to find
 * and stop the strays. The gateway doesn't expose its terminal mode to the
 * client, so the caveat is stated conditionally in prose rather than detected.
 */
export function RunActionsAccordion() {
  const t = useTranslations('settings');
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );
  const isBackground = settings.projectRunMode === 'background';

  return (
    <Accordion title={t('system.runActions.title')} icon={<Rocket className="h-3.5 w-3.5" />}>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('system.runActions.mode')}</p>
            <p className="text-xs text-muted-foreground">
              {t(
                isBackground
                  ? 'system.runActions.backgroundHint'
                  : 'system.runActions.terminalHint',
              )}
            </p>
          </div>
          <div
            role="group"
            aria-label={t('system.runActions.modeAria')}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5"
          >
            {MODES.map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={settings.projectRunMode === mode}
                onClick={() => setSettings((prev) => ({ ...prev, projectRunMode: mode }))}
                className={cn(
                  'h-7 px-2.5 text-xs',
                  settings.projectRunMode === mode && 'bg-accent text-accent-foreground',
                )}
              >
                {t(`system.runActions.${mode}`)}
              </Button>
            ))}
          </div>
        </div>

        {isBackground ? <TmuxWarning /> : null}
      </div>
    </Accordion>
  );
}

/**
 * The amber caveat + cleanup recipe for background runs under the tmux backend.
 * Prose comes from the catalog; the commands are {@link TMUX_COMMANDS}.
 */
function TmuxWarning() {
  const t = useTranslations('settings');
  const steps = [
    { label: t('system.runActions.tmux.listLabel'), cmd: TMUX_COMMANDS.list },
    { label: t('system.runActions.tmux.killLabel'), cmd: TMUX_COMMANDS.kill },
    { label: t('system.runActions.tmux.killAllLabel'), cmd: TMUX_COMMANDS.killAll },
  ];

  return (
    <div
      role="note"
      className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold">{t('system.runActions.tmux.title')}</p>
          <p className="text-xs leading-relaxed">{t('system.runActions.tmux.body')}</p>
        </div>
      </div>
      <ul className="space-y-1.5 pl-6">
        {steps.map(({ label, cmd }) => (
          <li key={label} className="space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
              {label}
            </span>
            {/* Commands can be long — let the block scroll rather than the page. */}
            <code className="block overflow-x-auto whitespace-pre rounded border border-amber-500/30 bg-background/40 px-2 py-1 font-mono text-[11px] text-foreground">
              {cmd}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
