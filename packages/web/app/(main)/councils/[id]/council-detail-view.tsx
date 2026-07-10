'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { AgentCli, Council, CouncilFormat, CouncilMember, CouncilRun } from '@midnite/shared';
import { CouncilMembersPanel } from '@/components/council-participants-panel';
import { CouncilRunTabs } from '@/components/council-run-tabs';
import { CouncilRunThread } from '@/components/council-run-thread';
import { CouncilComposer } from '@/components/council-topic-composer';
import { CouncilCustomFormatModal } from '@/components/council-custom-format-modal';
import { PageHeader } from '@/components/page-header';
import { RailFloatingToggle, RailHeaderToggle } from '@/components/rail-shell';
import {
  listCouncilRuns,
  retryCouncilRunMember,
  skipCouncilRunMember,
  updateCouncil,
} from '@/lib/api';
import { useCouncilRun } from '@/lib/use-council-run';
import { useLocalStorage } from '@/lib/use-local-storage';
import { useIsMobile } from '@/hooks/use-media-query';

type Props = {
  initial: Council;
  initialRuns: CouncilRun[];
};

export function CouncilDetailView({ initial, initialRuns }: Props) {
  const [members, setMembers] = useState<CouncilMember[]>(initial.members);
  const [synthProvider, setSynthProvider] = useState<AgentCli>(initial.synthProvider);
  const [defaultFormat, setDefaultFormat] = useState<CouncilFormat>(initial.defaultFormat);
  const [customPrompt, setCustomPrompt] = useState<string>(initial.customPrompt ?? '');
  const [customOpen, setCustomOpen] = useState(false);
  const [runs, setRuns] = useState<CouncilRun[]>(initialRuns);
  const [threadOpen, setThreadOpen] = useLocalStorage<boolean>('midnite.councils.thread', true);
  const [panelOpen, setPanelOpen] = useLocalStorage<boolean>('midnite.councils.panel', true);
  const isMobile = useIsMobile();

  const refreshRuns = useCallback(() => {
    listCouncilRuns(initial.id)
      .then(setRuns)
      .catch(() => {
        // thread refresh is best-effort; the active run is already in state
      });
  }, [initial.id]);

  const { run, running, error, start, retrySynthesis, select, resume } = useCouncilRun(
    initial.id,
    refreshRuns,
  );

  const live = running || run?.status === 'running' || run?.status === 'synthesizing';
  const canStart = members.length >= 1 && !live;

  const submitPrompt = useCallback(
    async (prompt: string, format: CouncilFormat) => {
      await start(prompt, format);
      refreshRuns();
    },
    [start, refreshRuns],
  );

  // Single discrete choices — save straight away rather than debouncing.
  const changeSynthProvider = useCallback(
    (cli: AgentCli) => {
      setSynthProvider(cli);
      updateCouncil(initial.id, { synthProvider: cli }).catch(() => {
        setSynthProvider(initial.synthProvider); // revert on failure
      });
    },
    [initial.id, initial.synthProvider],
  );

  const changeDefaultFormat = useCallback(
    (format: CouncilFormat) => {
      setDefaultFormat(format);
      updateCouncil(initial.id, { defaultFormat: format }).catch(() => {
        setDefaultFormat(initial.defaultFormat); // revert on failure
      });
    },
    [initial.id, initial.defaultFormat],
  );

  // Persist the reusable custom synthesis prompt; the modal closes itself on save.
  const saveCustomPrompt = useCallback(
    async (next: string) => {
      const prev = customPrompt;
      setCustomPrompt(next);
      try {
        await updateCouncil(initial.id, { customPrompt: next });
      } catch {
        setCustomPrompt(prev); // revert on failure
      }
    },
    [initial.id, customPrompt],
  );

  // Stop waiting on a hung member; the 1.2s poll picks up the new state.
  const skipMember = useCallback(
    (runMemberId: string) => {
      if (!run) return;
      skipCouncilRunMember(initial.id, run.id, runMemberId).catch(() => {
        // racing a natural exit is fine — the poll shows whichever settled first
      });
    },
    [initial.id, run],
  );

  // Rerun one settled member of the shown run; adopt the now-live run.
  const retryMember = useCallback(
    (runMemberId: string) => {
      if (!run) return;
      retryCouncilRunMember(initial.id, run.id, runMemberId)
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

  // Re-synthesize the shown run's captured responses, optionally switching format.
  const reSynthesize = useCallback(
    (format: CouncilFormat) => {
      void retrySynthesis(format).then(refreshRuns);
    },
    [retrySynthesis, refreshRuns],
  );

  // The council as edited in this view — fed to the custom-prompt modal so it
  // shows the latest saved name + customPrompt without a refetch.
  const council = useMemo<Council>(
    () => ({ ...initial, members, synthProvider, defaultFormat, customPrompt }),
    [initial, members, synthProvider, defaultFormat, customPrompt],
  );

  return (
    <>
      {/* The shared sticky header: full at the top, compacts on scroll (same as
          every other page) — the title and back control never leave view. */}
      <PageHeader
        title={initial.name}
        description={initial.description}
        actions={
          <div className="flex items-center gap-2">
            {isMobile ? (
              <>
                <RailHeaderToggle side="left" open={threadOpen} onClick={() => setThreadOpen(!threadOpen)} />
                <RailHeaderToggle side="right" open={panelOpen} onClick={() => setPanelOpen(!panelOpen)} />
              </>
            ) : null}
            <Link
              href="/councils"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All councils
            </Link>
          </div>
        }
      />
      <div className="container space-y-5 pb-48 pt-2">
        {/* Thread (left) and members (right) flank the run content; both collapse
            to slim rails. The fixed composer floats over the bottom, so
            everything gets generous bottom padding to scroll clear of it. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <CouncilRunThread
            runs={runs}
            selectedId={run?.id ?? null}
            onSelect={select}
            open={threadOpen}
          />

          <div className="relative min-w-0 flex-1">
            {/* Content-layer toggles float over the run output's top corners and
                glide with each rail as it animates (matches the workflow editor). */}
            {!isMobile ? (
              <>
                <RailFloatingToggle
                  side="left"
                  open={threadOpen}
                  title="Thread"
                  onToggle={() => setThreadOpen(!threadOpen)}
                />
                <RailFloatingToggle
                  side="right"
                  open={panelOpen}
                  title="Members"
                  onToggle={() => setPanelOpen(!panelOpen)}
                />
              </>
            ) : null}

            <div className="space-y-4 lg:pt-11">
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              {run ? (
                <CouncilRunTabs
                  key={run.id}
                  councilId={initial.id}
                  councilName={initial.name}
                  run={run}
                  onSkip={live ? skipMember : undefined}
                  onRetryMember={!live ? retryMember : undefined}
                  onReSynthesize={!live ? reSynthesize : undefined}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                  Submit a prompt below and each member will respond from its role in its own
                  terminal. The responses are then handed to the synthesizer and distilled in your
                  chosen format.
                </div>
              )}
            </div>
          </div>

          <CouncilMembersPanel
            councilId={initial.id}
            members={members}
            synthProvider={synthProvider}
            defaultFormat={defaultFormat}
            disabled={Boolean(live)}
            onChanged={setMembers}
            onSynthProviderChange={changeSynthProvider}
            onDefaultFormatChange={changeDefaultFormat}
            onEditCustom={() => setCustomOpen(true)}
            open={panelOpen}
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
                className="hidden shrink-0 transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:block"
                style={{ width: threadOpen ? 240 : 0 }}
              />
              <div className="pointer-events-auto min-w-0 flex-1">
                <CouncilComposer
                  disabled={!canStart}
                  disabledHint={
                    live
                      ? 'A run is in progress — wait for the synthesis.'
                      : members.length < 1
                        ? 'Add at least 1 member in the panel to start.'
                        : undefined
                  }
                  defaultFormat={defaultFormat}
                  onSubmit={submitPrompt}
                  onEditCustom={() => setCustomOpen(true)}
                />
              </div>
              <div
                aria-hidden
                className="hidden shrink-0 transition-[width] duration-300 ease-in-out motion-reduce:transition-none lg:block"
                style={{ width: panelOpen ? 320 : 0 }}
              />
            </div>
          </div>
        </div>
      </div>

      {customOpen ? (
        <CouncilCustomFormatModal
          council={council}
          onSave={saveCustomPrompt}
          onClose={() => setCustomOpen(false)}
        />
      ) : null}
    </>
  );
}
