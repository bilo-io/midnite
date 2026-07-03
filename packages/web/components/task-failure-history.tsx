'use client';

import { useEffect, useState } from 'react';
import { FAILURE_CLASS_LABEL, type TaskFailure } from '@midnite/shared';
import { fetchTaskFailures } from '@/lib/api';

/** Phase 53 E — the structured `task_failures` history for a task (what failed,
 *  when, exit code, last-output snippet), shown in the task detail. Fetched lazily;
 *  renders nothing when the task has no recorded failures. */
export function TaskFailureHistory({ taskId }: { taskId: string }) {
  const [failures, setFailures] = useState<TaskFailure[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTaskFailures(taskId)
      .then((f) => {
        if (!cancelled) setFailures(f);
      })
      .catch(() => {
        /* fail-open: no history section on error */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  if (!loaded || failures.length === 0) return null;

  return (
    <section>
      <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Failure history ({failures.length})
      </h3>
      <ol className="space-y-2">
        {failures.map((f) => (
          <li key={f.id} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium">{FAILURE_CLASS_LABEL[f.class]}</span>
              <span className="text-xs text-muted-foreground">attempt {f.retryIndex}</span>
              {f.exitCode != null ? (
                <span className="text-xs text-muted-foreground">· exit {f.exitCode}</span>
              ) : null}
              <span className="ml-auto text-[11px] text-muted-foreground">
                {new Date(f.at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{f.detail}</p>
            {f.lastOutput ? (
              <pre className="mt-1 max-h-28 overflow-auto rounded bg-background/60 p-2 text-[11px] leading-snug text-muted-foreground">
                {f.lastOutput}
              </pre>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
