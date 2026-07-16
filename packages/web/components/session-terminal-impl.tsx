'use client';

import { AGENT_CLI_LABEL, AgentCliSchema, type SessionSummary } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { LiveTerminal } from '@/components/live-terminal';

export function SessionTerminalImpl({ session }: { session: SessionSummary }) {
  // Header reads "{project folder} {agent icon} {agent name}" rather than the
  // live foreground process — the agent is a more meaningful label than "zsh".
  const parsed = AgentCliSchema.safeParse(session.agentCli);
  const cli = parsed.success ? parsed.data : null;

  return (
    <LiveTerminal
      attachId={session.id}
      label={session.projectDisplay}
      headerLeft={
        <span className="flex items-center gap-1.5 font-mono">
          <span className="truncate">{session.projectDisplay}</span>
          {cli ? (
            <>
              <AgentCliLogo cli={cli} className="h-3.5 w-3.5 shrink-0" />
              <span>{AGENT_CLI_LABEL[cli]}</span>
            </>
          ) : null}
        </span>
      }
      ariaLabel="Session terminal"
      approvals
    />
  );
}
