'use client';

import { PageHeader } from '@/components/page-header';
import { getProjects, getRepos, listWorkflows } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { SchedulesView } from './schedules-view';

export default function SchedulesPage() {
  const { data, error } = useApiData(() => Promise.all([listWorkflows(), getProjects(), getRepos()]));
  useGatewayErrorToast(error);
  const workflows = data?.[0] ?? [];
  const projects = data?.[1] ?? [];
  const repos = data?.[2] ?? [];

  return (
    <>
      <PageHeader
        title="Schedules"
        icon="CalendarClock"
        description="Recurring tasks that open on a cadence. Each schedule is a workflow you can also open in the full builder."
      />
      <div className="reveal-staged container space-y-6 pb-8 pt-2">
        <SchedulesView initial={workflows} projects={projects} repos={repos} />
      </div>
    </>
  );
}
