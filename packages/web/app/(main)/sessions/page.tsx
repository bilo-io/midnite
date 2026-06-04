import type { SessionSummary } from '@midnite/shared';
import { PageHeader } from '@/components/page-header';
import { getSessions } from '@/lib/api';
import { SessionsView } from './sessions-view';

export const dynamic = 'force-dynamic';

export default async function SessionsPage() {
  let sessions: SessionSummary[] = [];
  let error: string | null = null;
  try {
    sessions = await getSessions();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load sessions';
  }

  return (
    <>
      <PageHeader
        title="Sessions"
        description={
          <>
            Claude Code sessions currently running on this machine, sourced from{' '}
            <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-xs">~/.claude/projects</code>.
          </>
        }
      />
      <div className="container space-y-6 pb-8 pt-2">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Could not reach the gateway: {error}
          </div>
        )}

        <SessionsView initial={sessions} />
      </div>
    </>
  );
}
