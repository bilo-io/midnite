import { PageHeader } from '@/components/page-header';
import { AgentsView } from './agents-view';

export default function AgentsPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        title="Agents"
        description="Configure your orchestrator and the subagents it delegates to."
      />
      <AgentsView />
    </div>
  );
}
