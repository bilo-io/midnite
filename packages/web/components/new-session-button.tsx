'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { AGENT_CLIS, AGENT_CLI_LABEL, type AgentCli } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { SessionLaunchModal } from '@/components/session-launch-modal';

/**
 * The Sessions page "New session" control: a button that drops down a list of
 * coding agents (icon + name). Picking one opens a live terminal session running
 * that agent.
 */
export function NewSessionButton() {
  const [open, setOpen] = useState(false);
  const [launchCli, setLaunchCli] = useState<AgentCli | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="h-8 gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Plus className="h-3.5 w-3.5" />
        New session
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>

      {open ? (
        <div
          role="menu"
          className="animate-dialog-in absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg"
        >
          <p className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Coding agent
          </p>
          {AGENT_CLIS.map((cli) => (
            <button
              key={cli}
              type="button"
              role="menuitem"
              onClick={() => {
                setLaunchCli(cli);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
            >
              <AgentCliLogo cli={cli} className="h-4 w-4 shrink-0" />
              {AGENT_CLI_LABEL[cli]}
            </button>
          ))}
        </div>
      ) : null}

      {launchCli ? (
        <SessionLaunchModal cli={launchCli} onClose={() => setLaunchCli(null)} />
      ) : null}
    </div>
  );
}
