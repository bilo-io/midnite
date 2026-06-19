'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type {
  AgentCli,
  Brainstorm,
  BrainstormContributor,
  BrainstormRun,
  BrainstormSynthMode,
} from '@midnite/shared';
import { BrainstormContributorsPanel } from '@/components/brainstorm-contributors-panel';
import { BrainstormRunTabs } from '@/components/brainstorm-run-tabs';
import { BrainstormRunThread } from '@/components/brainstorm-run-thread';
import { BrainstormPromptComposer } from '@/components/brainstorm-prompt-composer';
import { PageHeader } from '@/components/page-header';
import {
  listBrainstormRuns,
  retryBrainstormRunContributor,
  retryBrainstormSynthesis,
  skipBrainstormRunContributor,
  updateBrainstorm,
} from '@/lib/api';
import { useBrainstormRun } from '@/lib/use-brainstorm-run';
import { useLocalStorage } from '@/lib/use-local-storage';

type Props = {
  initial: Brainstorm;
  initialRuns: BrainstormRun[];
};

export function BrainstormDetailView({ initial, initialRuns }: Props) {
  const [contributors, setContributors] = useState<BrainstormContributor[]>(initial.contributors);
  const [synthProvider, setSynthProvider] = useState<AgentCli>(initial.synthProvider);
  const [defaultMode, setDefaultMode] = useState<BrainstormSynthMode>(initial.defaultMode);
  const [runs, setRuns] = useState<BrainstormRun[]>(initialRuns);
  const [threadOpen, setThreadOpen] = useLocalStorage<boolean>('midnite.brainstorms.thread', true);
  const [panelOpen, setPanelOpen] = useLocalStorage<boolean>('midnite.brainstorms.panel', true);

  const refreshRuns = useCallback(() => {
    listBrainstormRuns(initial.id)
      .then(setRuns)
      .catch(() => {
        // thread refresh is best-effort; the active run is already in state
      });
  }, [initial.id]);

  const { run, running, error, start, select, resume } = useBrainstormRun(initial.id, refreshRuns);

  const live = running || run?.status === 'running' || run?.status === 'synthesizing';
  const canStart = contributors.length >= 1 && !live;

  const submitPrompt = useCallback(
    async (prompt: string, mode: BrainstormSynthMode) => {
      await start(prompt, mode);
      refreshRuns();
    },
    [start, refreshRuns],
  );

  // Single discrete choices — save straight away rather than debouncing.
  const changeSynthProvider = useCallback(
    (cli: AgentCli) => {
      setSynthProvider(cli);
      updateBrainstorm(initial.id, { synthProvider: cli }).catch(() => {
        setSynthProvider(initial.synthProvider); // revert on failure
      });
    },
    [initial.id, initial.synthProvider],
  );

  const changeDefaultMode = useCallback(
    (mode: BrainstormSynthMode) => {
      setDefaultMode(mode);
      updateBrainstorm(initial.id, { defaultMode: mode }).catch(() => {
        setDefaultMode(initial.defaultMode); // revert on failure
      });
    },
    [initial.id, initial.defaultMode],
  );

  // Stop waiting on a hung contributor; the 1.2s poll picks up the new state.
  const skipContributor = useCallback(
    (runContributorId: string) => {
      if (!run) return;
      skipBrainstormRunContributor(initial.id, run.id, runContributorId).catch(() => {
        // racing a natural exit is fine — the poll shows whichever settled first
      });
    },
    [initial.id, run],
  );

  // Rerun one settled contributor of the shown run; adopt the now-live run.
  const retryContributor = useCallback(
    (runContributorId: string) => {
      if (!run) return;
      retryBrainstormRunContributor(initial.id, run.id, runContributorId)
        .then((updated) => {
          resume(updated);
          refreshRuns();
        })
        .catch(() => {
          // 409 (another run live) — the poll/thread will reflect reality
        });
    },
    [initial.id, run, resume, refreshRuns],
  );

  // Re-distill the shown run's captured ideas, optionally switching mode.
  const reSynthesize = useCallback(
    (mode: BrainstormSynthMode) => {
      if (!run) return;
      retryBrainstormSynthesis(initial.id, run.id, mode)
        .then((updated) => {
          resume(updated);
          refreshRuns();
        })
        .catch(() => {
          // 409 (another run live) — the poll/thread will reflect reality
        });
    },
    [initial.id, run, resume, refreshRuns],
  );

  return (
    <>
      {/* The shared sticky header: full at the top, compacts on scroll (same as
          every other page) — the title and back control never leave view. */}
      <PageHeader
        title={initial.name}
        description={initial.description}
        actions={
          <Link
            href="/brainstorms"
            className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All brainstorms
          </Link>
        }
      />
      <div className="container space-y-5 pb-48 pt-2">
        {/* Thread (left) and contributors (right) flank the run content; both
            collapse to slim rails. The fixed composer floats over the bottom,
            so everything gets generous bottom padding to scroll clear of it. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <BrainstormRunThread
            runs={runs}
            selectedId={run?.id ?? null}
            onSelect={select}
            open={threadOpen}
            onToggle={() => setThreadOpen(!threadOpen)}
          />

          <div className="min-w-0 flex-1 space-y-4">
            {error ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {run ? (
              <BrainstormRunTabs
                key={run.id}
                run={run}
                onSkip={live ? skipContributor : undefined}
                onRetryContributor={!live ? retryContributor : undefined}
                onReSynthesize={!live ? reSynthesize : undefined}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                Submit a prompt below and each contributor will generate ideas through its lens in its
                own terminal. The ideas are then synthesized in your chosen mode.
              </div>
            )}
          </div>

          <BrainstormContributorsPanel
            brainstormId={initial.id}
            contributors={contributors}
            synthProvider={synthProvider}
            defaultMode={defaultMode}
            disabled={Boolean(live)}
            onChanged={setContributors}
            onSynthProviderChange={changeSynthProvider}
            onDefaultModeChange={changeDefaultMode}
            open={panelOpen}
            onToggle={() => setPanelOpen(!panelOpen)}
          />
        </div>
      </div>

      {/* Prompt input pinned to the bottom, dashboard-style: content scrolls
          behind it; the page's pb-48 keeps everything reachable above it. The
          bar mirrors the content row's nav-rail offset (pl-14), container, and
          thread/panel spacers so the composer lines up exactly with the run
          output column above it — in every collapsed/expanded combination. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pl-14">
        {/* Tall theme fade so long output washes out behind the composer
            instead of reading through it. */}
        <div className="bg-gradient-to-t from-background from-45% via-background/85 to-transparent pb-6 pt-20">
          <div className="container">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div
                aria-hidden
                className="hidden shrink-0 lg:block"
                style={{ width: threadOpen ? 240 : 36 }}
              />
              <div className="pointer-events-auto min-w-0 flex-1">
                <BrainstormPromptComposer
                  disabled={!canStart}
                  disabledHint={
                    live
                      ? 'A run is in progress — wait for the synthesis.'
                      : contributors.length < 1
                        ? 'Add at least 1 contributor in the panel to start.'
                        : undefined
                  }
                  defaultMode={defaultMode}
                  onSubmit={submitPrompt}
                />
              </div>
              <div
                aria-hidden
                className="hidden shrink-0 lg:block"
                style={{ width: panelOpen ? 320 : 36 }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
