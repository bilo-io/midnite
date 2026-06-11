'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Council, CouncilParticipant, CouncilRun } from '@midnite/shared';
import { CouncilParticipantsPanel } from '@/components/council-participants-panel';
import { CouncilRunTabs } from '@/components/council-run-tabs';
import { CouncilRunThread } from '@/components/council-run-thread';
import { CouncilTopicComposer } from '@/components/council-topic-composer';
import { listCouncilRuns, skipCouncilRunParticipant } from '@/lib/api';
import { useCouncilRun } from '@/lib/use-council-run';

type Props = {
  initial: Council;
  initialRuns: CouncilRun[];
};

export function CouncilDetailView({ initial, initialRuns }: Props) {
  const [participants, setParticipants] = useState<CouncilParticipant[]>(initial.participants);
  const [runs, setRuns] = useState<CouncilRun[]>(initialRuns);

  const refreshRuns = useCallback(() => {
    listCouncilRuns(initial.id)
      .then(setRuns)
      .catch(() => {
        // thread refresh is best-effort; the active run is already in state
      });
  }, [initial.id]);

  const { run, running, error, start, select } = useCouncilRun(initial.id, refreshRuns);

  const live = running || run?.status === 'running' || run?.status === 'synthesizing';
  const canStart = participants.length >= 2 && !live;

  const submitTopic = useCallback(
    async (topic: string) => {
      await start(topic);
      refreshRuns();
    },
    [start, refreshRuns],
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

  return (
    <div className="container space-y-5 pb-8 pt-6">
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
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
              <CouncilRunTabs key={run.id} run={run} onSkip={live ? skipParticipant : undefined} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              Submit a topic and each participant will argue it from their perspective in its own
              terminal. The takes are then anonymized and weighed into a verdict.
            </div>
          )}

          <CouncilRunThread runs={runs} selectedId={run?.id ?? null} onSelect={select} />
        </div>

        <CouncilParticipantsPanel
          councilId={initial.id}
          participants={participants}
          disabled={Boolean(live)}
          onChanged={setParticipants}
        />
      </div>
    </div>
  );
}
