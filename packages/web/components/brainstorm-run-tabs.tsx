'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, RotateCcw, Sparkles, SkipForward } from 'lucide-react';
import {
  AGENT_CLI_LABEL,
  BRAINSTORM_SYNTH_MODES,
  BRAINSTORM_SYNTH_MODE_LABEL,
  type BrainstormRun,
  type BrainstormRunContributor,
  type BrainstormSynthMode,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// xterm touches `window` — client-only, like SessionTerminal.
const LiveTerminal = dynamic(
  () => import('@/components/live-terminal').then((m) => m.LiveTerminal),
  { ssr: false },
);

const MODE_OPTIONS: SelectOption<BrainstormSynthMode>[] = BRAINSTORM_SYNTH_MODES.map((m) => ({
  value: m,
  label: BRAINSTORM_SYNTH_MODE_LABEL[m],
}));

const STATUS_DOT: Record<BrainstormRunContributor['status'], string> = {
  running: 'bg-blue-500 animate-pulse',
  succeeded: 'bg-emerald-500',
  failed: 'bg-destructive',
  timeout: 'bg-amber-500',
  skipped: 'bg-muted-foreground/60',
};

/** The looping highlight sweep on a still-running contributor's tab. */
function TabShimmer() {
  return (
    <span
      aria-hidden
      className="pill-shimmer pointer-events-none absolute inset-0"
      style={{
        background:
          'linear-gradient(100deg, transparent 38%, hsl(217 91% 60% / 0.22) 50%, transparent 62%)',
      }}
    />
  );
}

const SYNTH_TAB = '__synthesis__';

/**
 * The main panel of a brainstorm run: one tab per contributor (live terminal
 * while generating, persisted ideas after) plus the Synthesis tab. Terminals
 * stay mounted-but-hidden across tab switches so their sockets and scrollback
 * survive; the run id keys the whole strip so a new run starts fresh.
 */
export function BrainstormRunTabs({
  run,
  onSkip,
  onRetryContributor,
  onReSynthesize,
}: {
  run: BrainstormRun;
  /** Skip a still-running contributor (live runs only — absent for past runs). */
  onSkip?: (runContributorId: string) => void;
  /** Rerun a settled contributor (finished runs only). */
  onRetryContributor?: (runContributorId: string) => void;
  /** Re-synthesize the captured ideas in a (possibly new) mode (finished runs only). */
  onReSynthesize?: (mode: BrainstormSynthMode) => void;
}) {
  const [active, setActive] = useState<string>(run.contributors[0]?.id ?? SYNTH_TAB);

  // Jump to the synthesis once it starts — the generation itself is over.
  useEffect(() => {
    if (run.status === 'synthesizing' || run.status === 'completed') setActive(SYNTH_TAB);
  }, [run.status]);

  const activeContributor = run.contributors.find((c) => c.id === active) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Prompt + tab strip stay pinned to the top while the output scrolls
          beneath them. */}
      <div className="sticky top-[52px] z-20 -mx-1 flex flex-col gap-2 border-b border-border/60 bg-background/95 px-1 pb-2 pt-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Prompt: <span className="text-foreground">{run.prompt}</span>
        </p>
        <div role="tablist" aria-label="Brainstorm run" className="flex flex-wrap items-center gap-1.5">
          {run.contributors.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                'relative flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active === c.id
                  ? 'border-foreground/20 bg-accent text-accent-foreground'
                  : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {c.status === 'running' ? <TabShimmer /> : null}
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[c.status])} aria-hidden />
              <AgentCliLogo cli={c.provider} className="h-3.5 w-3.5" />
              {c.name.trim() || `Contributor ${i + 1}`}
            </button>
          ))}
          <button
            type="button"
            role="tab"
            aria-selected={active === SYNTH_TAB}
            onClick={() => setActive(SYNTH_TAB)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active === SYNTH_TAB
                ? 'border-foreground/20 bg-accent text-accent-foreground'
                : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Synthesis
          </button>
        </div>
      </div>

      {/* Live terminals stay mounted (hidden) so a tab switch doesn't drop the WS. */}
      {run.contributors.map((c, i) =>
        c.status === 'running' ? (
          <div key={c.id} className={cn('space-y-2', active !== c.id && 'hidden')}>
            {onSkip ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSkip(c.id)}
                  title="Stop waiting on this contributor — the synthesis proceeds without it"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip contributor
                </Button>
              </div>
            ) : null}
            <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
              <LiveTerminal
                attachId={c.terminalId}
                label={`${c.name.trim() || `Contributor ${i + 1}`} · ${c.provider}`}
                ariaLabel={`${c.name.trim() || `Contributor ${i + 1}`} terminal`}
              />
            </div>
          </div>
        ) : null,
      )}

      {activeContributor && activeContributor.status !== 'running' ? (
        <ContributorOutput contributor={activeContributor} onRetry={onRetryContributor} />
      ) : null}

      {active === SYNTH_TAB ? (
        <SynthesisPanel run={run} onSkip={onSkip} onReSynthesize={onReSynthesize} />
      ) : null}
    </div>
  );
}

function ContributorOutput({
  contributor: c,
  onRetry,
}: {
  contributor: BrainstormRunContributor;
  onRetry?: (runContributorId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[c.status])} aria-hidden />
          {c.lens.trim() ? <span className="text-foreground">{c.lens.trim()}</span> : null}
          <span>
            {c.status === 'succeeded'
              ? 'Generated'
              : c.status === 'timeout'
                ? 'Timed out'
                : c.status === 'skipped'
                  ? 'Skipped'
                  : 'Failed'}
          </span>
        </span>
        {onRetry && c.status !== 'succeeded' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRetry(c.id)}
            title="Rerun this contributor, then re-synthesize"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Rerun
          </Button>
        ) : null}
      </div>
      {c.error && c.status !== 'succeeded' ? (
        <p className="text-sm text-destructive">{c.error}</p>
      ) : null}
      {c.output ? (
        <MarkdownPreview content={c.output} />
      ) : (
        <p className="text-sm text-muted-foreground">No ideas captured.</p>
      )}
    </div>
  );
}

/** The mode picker + button shown on finished runs to re-distill the same ideas. */
function ReSynthesizeControl({
  run,
  onReSynthesize,
}: {
  run: BrainstormRun;
  onReSynthesize: (mode: BrainstormSynthMode) => void;
}) {
  const [mode, setMode] = useState<BrainstormSynthMode>(run.mode);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Synthesis mode"
        className="w-48"
        options={MODE_OPTIONS}
        value={mode}
        onChange={setMode}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onReSynthesize(mode)}>
        <RotateCcw className="h-3.5 w-3.5" />
        Re-synthesize
      </Button>
      <p className="text-xs text-muted-foreground">
        Re-runs only the synthesis over the captured ideas — switch modes freely; contributors don't
        re-run.
      </p>
    </div>
  );
}

function SynthesisPanel({
  run,
  onSkip,
  onReSynthesize,
}: {
  run: BrainstormRun;
  onSkip?: (runContributorId: string) => void;
  onReSynthesize?: (mode: BrainstormSynthMode) => void;
}) {
  if (run.status === 'running') {
    const waiting = run.contributors.filter((c) => c.status === 'running');
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting on {waiting.length} contributor{waiting.length === 1 ? '' : 's'}…
        </div>
        <ul className="space-y-1.5">
          {waiting.map((c, i) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT.running)} aria-hidden />
              <AgentCliLogo cli={c.provider} className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">
                {c.name.trim() || `Contributor ${i + 1}`}
                <span className="text-muted-foreground"> · {c.provider}</span>
              </span>
              {onSkip ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(c.id)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Stop waiting on this contributor — the synthesis proceeds without it"
                >
                  <SkipForward className="h-3 w-3" />
                  Skip
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (run.status === 'synthesizing') {
    const synth = run.synthProvider ? AGENT_CLI_LABEL[run.synthProvider] : 'The synthesizer';
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {run.synthProvider ? <AgentCliLogo cli={run.synthProvider} className="h-4 w-4" /> : null}
          Synthesizing ({BRAINSTORM_SYNTH_MODE_LABEL[run.mode]}) — {synth} is distilling the ideas…
        </div>
        {run.synthTerminalId ? (
          <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
            <LiveTerminal
              attachId={run.synthTerminalId}
              label={`Synthesis · ${synth}`}
              ariaLabel="Synthesis terminal"
            />
          </div>
        ) : null}
      </div>
    );
  }
  if (run.status === 'failed') {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="break-words text-sm text-destructive">{run.error ?? 'The run failed.'}</p>
        {onReSynthesize ? <ReSynthesizeControl run={run} onReSynthesize={onReSynthesize} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          {BRAINSTORM_SYNTH_MODE_LABEL[run.mode]}
        </span>
      </div>
      {onReSynthesize ? <ReSynthesizeControl run={run} onReSynthesize={onReSynthesize} /> : null}
      {run.synthesis ? (
        <MarkdownPreview content={run.synthesis} />
      ) : (
        <p className="text-sm text-muted-foreground">No synthesis recorded.</p>
      )}
    </div>
  );
}
