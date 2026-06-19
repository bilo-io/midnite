'use client';

import { PageHeader } from '@/components/page-header';
import { SearchBar } from '@/components/search-bar';
import { getProjects, getSessions, getTasks } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { SessionsView } from './sessions-view';

export default function SessionsPage() {
  const { data, error } = useApiData(() => Promise.all([getSessions(), getTasks(), getProjects()]));
  const sessions = data?.[0] ?? [];
  const tasks = data?.[1] ?? [];
  const projects = data?.[2] ?? [];
  useGatewayErrorToast(error);

  return (
    <>
      <PageHeader
        title="Sessions"
        icon="BotMessageSquare"
        description="One session per task — its status follows the task (in progress, awaiting input, completed, or idle)."
        actions={<SearchBar placeholder="Search sessions" />}
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <SessionsView initial={sessions} tasks={tasks} projects={projects} />
      </div>
    </>
  );
}
