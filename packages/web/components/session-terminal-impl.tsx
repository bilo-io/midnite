'use client';

import type { SessionSummary } from '@midnite/shared';
import { LiveTerminal } from '@/components/live-terminal';

export function SessionTerminalImpl({ session }: { session: SessionSummary }) {
  return (
    <LiveTerminal
      attachId={session.id}
      label={session.projectDisplay}
      ariaLabel="Session terminal"
      approvals
    />
  );
}
