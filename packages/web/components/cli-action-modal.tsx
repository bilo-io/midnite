'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AGENT_CLI_LABEL, type AgentCli, type CliTerminalAction } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { createCliTerminal } from '@/lib/api';
import { TerminalStarting } from '@/components/session-terminal-starting';

// xterm.js touches the DOM — load the terminal view client-only, same as the
// session terminal.
// The loading fallback is a component (not inline JSX) because a hook can't be
// called inside `dynamic()`'s options object — same seam PR #597 introduced for
// the session terminal.
const LiveTerminal = dynamic(() => import('./live-terminal').then((m) => m.LiveTerminal), {
  ssr: false,
  loading: () => <TerminalStarting />,
});

type Props = {
  cli: AgentCli;
  action: CliTerminalAction;
  onClose: () => void;
};

/**
 * A standalone terminal (not tied to any session) that pastes the install or
 * uninstall command for a CLI and waits for the user to press Enter. Closing
 * leaves the PTY to be reaped on idle.
 */
export function CliActionModal({ cli, action, onClose }: Props) {
  const t = useTranslations('setup');
  const tCommon = useTranslations('common');
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createCliTerminal(cli, action)
      .then((id) => {
        if (!cancelled) setTerminalId(id);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : action === 'install'
                ? t('cliAction.startFailedInstall')
                : t('cliAction.startFailedUninstall'),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cli, action, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const label = AGENT_CLI_LABEL[cli];
  const verb = action === 'install' ? t('cliAction.install') : t('cliAction.uninstall');
  const hint =
    action === 'install' ? t('cliAction.hintInstall') : t('cliAction.hintUninstall');

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('cliAction.dialogLabel', { verb, label })}
          className="pointer-events-auto flex h-[80vh] max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <AgentCliLogo cli={cli} className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">
                {t('cliAction.heading', { verb, label })}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.rich('cliAction.hintSuffix', {
                  hint,
                  kbd: (chunks) => (
                    <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">
                      {chunks}
                    </kbd>
                  ),
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tCommon('close')}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 px-5 py-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : terminalId ? (
              <LiveTerminal
                attachId={terminalId}
                label={label}
                ariaLabel={t('cliAction.terminalAria', { verb, label })}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {action === 'install'
                  ? t('cliAction.preparingInstall')
                  : t('cliAction.preparingUninstall')}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
