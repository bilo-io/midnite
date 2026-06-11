'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { AGENT_CLI_LABEL, type AgentCli, type CliTerminalAction } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { createCliTerminal } from '@/lib/api';

// xterm.js touches the DOM — load the terminal view client-only, same as the
// session terminal.
const LiveTerminal = dynamic(() => import('./live-terminal').then((m) => m.LiveTerminal), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Starting terminal…
    </div>
  ),
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
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createCliTerminal(cli, action)
      .then((id) => {
        if (!cancelled) setTerminalId(id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : `Failed to start ${action}`);
      });
    return () => {
      cancelled = true;
    };
  }, [cli, action]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  const label = AGENT_CLI_LABEL[cli];
  const verb = action === 'install' ? 'Install' : 'Uninstall';
  const hint =
    action === 'install'
      ? 'The install command is typed below'
      : 'The uninstall command is typed below';

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
          aria-label={`${verb} ${label}`}
          className="pointer-events-auto flex h-[80vh] max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <AgentCliLogo cli={cli} className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">
                {verb} {label}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {hint} — press{' '}
                <kbd className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium">Enter</kbd> to
                run it. Close anytime.
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
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
                ariaLabel={`${verb} ${label} terminal`}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preparing {action}…
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
