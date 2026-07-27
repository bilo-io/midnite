'use client';

import { useEffect, useState } from 'react';
import { Check, FileText, Loader2, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ProjectDoc } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { LiveTerminal } from '@/components/live-terminal';
import { MarkdownPreview } from '@/components/markdown-preview';
import { getProjectDocs } from '@/lib/api';
import { usePlanOverviewRun } from '@/lib/use-plan-overview-run';

type Props = {
  projectId: string;
  /** Fires once the user approves a settled overview, with its captured text. */
  onApprove: (overview: string) => void;
};

/**
 * Draft-plan Stage 1: pick which project docs to feed in as context, then draft
 * a high-level execution-plan overview *live* in a PTY (like a council run) —
 * not a quiet API call. The captured output is reviewed before the caller moves
 * on to Stage 2 (the existing dependency-aware breakdown flow).
 */
export function PlanOverviewStep({ projectId, onApprove }: Props) {
  const t = useTranslations('plan');
  const [docs, setDocs] = useState<ProjectDoc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const { run, terminalId, running, error, start } = usePlanOverviewRun(projectId);

  useEffect(() => {
    let cancelled = false;
    getProjectDocs(projectId)
      .then((items) => {
        if (!cancelled) setDocs(items);
      })
      .catch(() => {
        // No docs to select is a fine starting state — the overview still
        // drafts from the project's description/plan alone.
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const draft = () => void start([...selectedDocIds]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t('overview.contextDocsHeading')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('overview.contextDocsHint')}</p>
        {docsLoading ? (
          <p className="text-sm text-muted-foreground">{t('overview.docsLoading')}</p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('overview.noDocsYet')}</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((doc) => (
              <li key={doc.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                  <input
                    type="checkbox"
                    checked={selectedDocIds.has(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-foreground"
                  />
                  <span className="text-sm">{doc.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!run ? (
        <Button type="button" onClick={draft} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {t('overview.draftOverview')}
        </Button>
      ) : (
        <div className="space-y-3">
          {terminalId && run.status === 'running' ? (
            <div className="h-[360px] overflow-hidden rounded-lg border border-border/60">
              <LiveTerminal
                attachId={terminalId}
                label="Overview draft"
                ariaLabel="Overview draft terminal"
                loaderUntilOutput
              />
            </div>
          ) : null}

          {run.status === 'running' ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('overview.drafting')}
            </div>
          ) : run.status === 'error' ? (
            <p className="text-sm text-destructive">{run.error ?? t('overview.draftFailed')}</p>
          ) : (
            <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4">
              <MarkdownPreview content={run.output ?? ''} />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={draft}
              disabled={run.status === 'running'}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('overview.regenerate')}
            </Button>
            {run.status === 'done' ? (
              <Button type="button" size="sm" onClick={() => onApprove(run.output ?? '')}>
                <Check className="h-3.5 w-3.5" />
                {t('overview.approve')}
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
