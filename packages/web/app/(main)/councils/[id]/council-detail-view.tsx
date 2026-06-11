'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { AgentCli, Council, CouncilParticipant, CouncilRun } from '@midnite/shared';
import { CouncilParticipantsPanel } from '@/components/council-participants-panel';
import { CouncilRunTabs } from '@/components/council-run-tabs';
import { CouncilRunThread } from '@/components/council-run-thread';
import { CouncilTopicComposer } from '@/components/council-topic-composer';
import {
  listCouncilRuns,
  retryCouncilRunParticipant,
  retryCouncilVerdict,
  skipCouncilRunParticipant,
  updateCouncil,
} from '@/lib/api';
import { useCouncilRun } from '@/lib/use-council-run';
import { useLocalStorage } from '@/lib/use-local-storage';

type Props = {
  initial: Council;
  initialRuns: CouncilRun[];
};

export function CouncilDetailView({ initial, initialRuns }: Props) {
  const [participants, setParticipants] = useState<CouncilParticipant[]>(initial.participants);
  const [verdictProvider, setVerdictProvider] = useState<AgentCli>(initial.verdictProvider);
  const [runs, setRuns] = useState<CouncilRun[]>(initialRuns);
  const [threadOpen, setThreadOpen] = useLocalStorage<boolean>('midnite.councils.thread', true);
  const [panelOpen, setPanelOpen] = useLocalStorage<boolean>('midnite.councils.panel', true);

  const refreshRuns = useCallback(() => {
    listCouncilRuns(initial.id)
      .then(setRuns)
      .catch(() => {
        // thread refresh is best-effort; the active run is already in state
      });
  }, [initial.id]);

  const { run, running, error, start, select, resume } = useCouncilRun(initial.id, refreshRuns);

  const live = running || run?.status === 'running' || run?.status === 'synthesizing';
  const canStart = participants.length >= 2 && !live;

  const submitTopic = useCallback(
    async (topic: string) => {
      await start(topic);
      refreshRuns();
    },
    [start, refreshRuns],
  );

  // A single discrete choice — save it straight away rather than debouncing.
  const changeVerdictProvider = useCallback(
    (cli: AgentCli) => {
      setVerdictProvider(cli);
      updateCouncil(initial.id, { verdictProvider: cli }).catch(() => {
        setVerdictProvider(initial.verdictProvider); // revert on failure
      });
    },
    [initial.id, initial.verdictProvider],
  );

  // Stop waiting on a hung participant; the 1.2s poll picks up the new state.
  const skipParticipant = useCallback(
    (runParticipantId: string) => {
      if (!run) return;
      skipCouncilRunParticipant(initial.id, run.id, runParticipantId).catch(() => {
        // racing a natural exit is fine — the poll shows whichever settled first
      });
    },
    [initial.id, run],
  );

  // Rerun one settled participant of the shown run; adopt the now-live run.
  const retryParticipant = useCallback(
    (runParticipantId: string) => {
      if (!run) return;
      retryCouncilRunParticipant(initial.id, run.id, runParticipantId)
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

  // Re-judge the shown run's saved outputs with the currently-selected provider.
  const retryVerdict = useCallback(() => {
    if (!run) return;
    retryCouncilVerdict(initial.id, run.id)
      .then((updated) => {
        resume(updated);
        refreshRuns();
      })
      .catch(() => {
        // 409 (another run live) — the poll/thread will reflect reality
      });
  }, [initial.id, run, resume, refreshRuns]);

  return (
    <>
      <div className="container space-y-5 pb-48 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/councils"
              className="mb-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Councils
            </Link>
            <h1 className="truncate text-xl font-semibold">{initial.name}</h1>
            {initial.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{initial.description}</p>
            ) : null}
          </div>
        </div>

        {/* Thread (left) and participants (right) flank the run content; both
            collapse to slim rails. The fixed composer floats over the bottom,
            so everything gets generous bottom padding to scroll clear of it. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <CouncilRunThread
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
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Topic: <span className="text-foreground">{run.topic}</span>
                </p>
                <CouncilRunTabs
                  key={run.id}
                  run={run}
                  onSkip={live ? skipParticipant : undefined}
                  onRetryParticipant={!live ? retryParticipant : undefined}
                  onRetryVerdict={!live ? retryVerdict : undefined}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                Submit a topic below and each participant will argue it from their perspective in
                its own terminal. The takes are then anonymized and weighed into a verdict.
              </div>
            )}
          </div>

          <CouncilParticipantsPanel
            councilId={initial.id}
            participants={participants}
            verdictProvider={verdictProvider}
            disabled={Boolean(live)}
            onChanged={setParticipants}
            onVerdictProviderChange={changeVerdictProvider}
            open={panelOpen}
            onToggle={() => setPanelOpen(!panelOpen)}
          />
        </div>
      </div>

      {/* Topic input pinned to the bottom, dashboard-style: content scrolls
          behind it; the page's pb-48 keeps everything reachable above it. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
        <div className="pb-6 pt-2">
          <div className="container">
            <div className="pointer-events-auto mx-auto w-full max-w-3xl">
              <CouncilTopicComposer
                disabled={!canStart}
                disabledHint={
                  live
                    ? 'A debate is in progress — wait for the verdict.'
                    : participants.length < 2
                      ? 'Add at least 2 participants in the panel to start a debate.'
                      : undefined
                }
                onSubmit={submitTopic}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
