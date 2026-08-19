'use client';

import { useTranslations } from 'next-intl';
import { AGENT_CLI_LABEL, AgentCliSchema, type SessionSummary } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { LiveTerminal } from '@/components/live-terminal';

export function SessionTerminalImpl({ session }: { session: SessionSummary }) {
  const t = useTranslations('sessions');
  // Header reads "{agent icon} {agent name}" rather than the live foreground
  // process — the agent is a more meaningful label than "zsh". The project /
  // app name is deliberately absent: the page around the terminal already says
  // which session (and project) this is.
  const parsed = AgentCliSchema.safeParse(session.agentCli);
  const cli = parsed.success ? parsed.data : null;

  return (
    <LiveTerminal
      attachId={session.id}
      label={session.projectDisplay}
      headerLeft={
        <span className="flex min-w-0 items-center gap-1.5 font-mono">
          {cli ? (
            <>
              <AgentCliLogo cli={cli} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{AGENT_CLI_LABEL[cli]}</span>
            </>
          ) : null}
        </span>
      }
      ariaLabel={t('terminal.ariaLabel')}
      approvals
    />
  );
}
