'use client';

import Link from 'next/link';
import type { Project } from '@midnite/shared';
import { STATUS_PILL } from '@/components/council-run-thread';
import { ProjectPlanPanel } from '@/components/projects/panels/project-plan-panel';
import { getCouncilRunsByProject } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';
import { cn, relativeTime } from '@/lib/utils';

type Props = {
  project: Project;
};

/**
 * The council runs linked to this project — a compact, read-only list. Reuses
 * the same status-pill mapping the council's own thread renders (`STATUS_PILL`
 * in `council-run-thread.tsx`) so a run reads identically in both places. There
 * is no run-specific deep link in the app today (council run selection is local
 * component state, not a URL param), so each row links to the council itself
 * (`/councils/view?id=`), matching every other council link in the codebase.
 */
function ProjectCouncilRuns({ project }: Props) {
  const { data, loading, error } = useApiData(
    () => getCouncilRunsByProject(project.id),
    [project.id],
  );
  const runs = data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Council runs</label>
        {runs.length > 0 ? (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {runs.length} run{runs.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Loading council runs…
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : runs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No council runs linked to this project yet.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {runs.map((run) => {
            const pill = STATUS_PILL[run.status];
            return (
              <li key={run.id}>
                <Link
                  href={`/councils/view?id=${run.councilId}`}
                  className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5 text-sm hover:border-foreground/20 hover:bg-accent/40"
                >
                  <span className="min-w-0 flex-1 truncate">{run.prompt}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      pill.className,
                    )}
                  >
                    {pill.label}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {relativeTime(run.startedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * The project cockpit's Docs tab (renamed from Plan): council runs linked to
 * this project, above the project's generated planning documents. The
 * documents section is unchanged — it's the pre-existing, gateway-backed
 * `ProjectPlanPanel` (doc list + "Add document" + `PlanDocModal`), which is
 * still mounted as-is by `project-modal.tsx`'s own Plan tab, so it stays a
 * separate component rather than being folded in here.
 */
export function ProjectDocsPanel({ project }: Props) {
  return (
    <div className="space-y-6">
      <ProjectCouncilRuns project={project} />
      <div className="border-t border-border/60 pt-4">
        <ProjectPlanPanel project={project} />
      </div>
    </div>
  );
}
