'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, RotateCcw, Scale, SkipForward } from 'lucide-react';
import { AGENT_CLI_LABEL, type CouncilRun, type CouncilRunParticipant } from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown-preview';
import { cn } from '@/lib/utils';

// xterm touches `window` — client-only, like SessionTerminal.
const LiveTerminal = dynamic(
  () => import('@/components/live-terminal').then((m) => m.LiveTerminal),
  { ssr: false },
);

const STATUS_DOT: Record<CouncilRunParticipant['status'], string> = {
  running: 'bg-blue-500 animate-pulse',
  succeeded: 'bg-emerald-500',
  failed: 'bg-destructive',
  timeout: 'bg-amber-500',
  skipped: 'bg-muted-foreground/60',
};

/** The looping highlight sweep on a still-running participant's tab (reuses
 *  the screensaver's pill-shimmer keyframes). */
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

const VERDICT_TAB = '__verdict__';

/**
 * The main panel of a council run: one tab per participant (live terminal
 * while running, persisted output after) plus the Verdict tab. Terminals stay
 * mounted-but-hidden across tab switches so their sockets and scrollback
 * survive; the run id keys the whole strip so a new debate starts fresh.
 */
export function CouncilRunTabs({
  run,
  onSkip,
  onRetryParticipant,
  onRetryVerdict,
}: {
  run: CouncilRun;
  /** Skip a still-running participant (live runs only — absent for past runs). */
  onSkip?: (runParticipantId: string) => void;
  /** Rerun a settled participant (finished runs only). */
  onRetryParticipant?: (runParticipantId: string) => void;
  /** Rerun only the verdict from the persisted outputs (finished runs only). */
  onRetryVerdict?: () => void;
}) {
  const [active, setActive] = useState<string>(run.participants[0]?.id ?? VERDICT_TAB);

  // Jump to the verdict once synthesis starts — the debate itself is over.
  useEffect(() => {
    if (run.status === 'synthesizing' || run.status === 'completed') setActive(VERDICT_TAB);
  }, [run.status]);

  const labelFor = (id: string | undefined) =>
    run.participants.find((p) => p.id === id) ?? null;
  const activeParticipant = labelFor(active);

  return (
    <div className="flex flex-col gap-3">
      {/* Topic + tab strip stay pinned to the top while the output scrolls
          beneath them — on the exact same surface as the sticky page header
          (border + bg/backdrop classes kept in lockstep with PageHeader). */}
      <div className="sticky top-[52px] z-20 -mx-1 flex flex-col gap-2 border-b border-border/60 bg-background/80 px-1 pb-2 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <p className="text-xs text-muted-foreground">
          Topic: <span className="text-foreground">{run.topic}</span>
        </p>
        <div role="tablist" aria-label="Council run" className="flex flex-wrap items-center gap-1.5">
        {run.participants.map((p, i) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active === p.id}
            onClick={() => setActive(p.id)}
            className={cn(
              'relative flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              active === p.id
                ? 'border-foreground/20 bg-accent text-accent-foreground'
                : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
            )}
          >
            {p.status === 'running' ? <TabShimmer /> : null}
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[p.status])} aria-hidden />
            <AgentCliLogo cli={p.provider} className="h-3.5 w-3.5" />
            {p.name.trim() || `Participant ${i + 1}`}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={active === VERDICT_TAB}
          onClick={() => setActive(VERDICT_TAB)}
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            active === VERDICT_TAB
              ? 'border-foreground/20 bg-accent text-accent-foreground'
              : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
          )}
        >
          <Scale className="h-3.5 w-3.5" />
          Verdict
        </button>
        </div>
      </div>

      {/* Live terminals stay mounted (hidden) so a tab switch doesn't drop the WS. */}
      {run.participants.map((p, i) =>
        p.status === 'running' ? (
          <div key={p.id} className={cn('space-y-2', active !== p.id && 'hidden')}>
            {onSkip ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSkip(p.id)}
                  title="Stop waiting on this participant — the verdict proceeds without it"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip participant
                </Button>
              </div>
            ) : null}
            <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
              <LiveTerminal
                attachId={p.terminalId}
                label={`${p.name.trim() || `Participant ${i + 1}`} · ${p.provider}`}
                ariaLabel={`${p.name.trim() || `Participant ${i + 1}`} terminal`}
              />
            </div>
          </div>
        ) : null,
      )}

      {activeParticipant && activeParticipant.status !== 'running' ? (
        <ParticipantOutput participant={activeParticipant} onRetry={onRetryParticipant} />
      ) : null}

      {active === VERDICT_TAB ? (
        <VerdictPanel run={run} onSkip={onSkip} onRetryVerdict={onRetryVerdict} />
      ) : null}
    </div>
  );
}

function ParticipantOutput({
  participant: p,
  onRetry,
}: {
  participant: CouncilRunParticipant;
  onRetry?: (runParticipantId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[p.status])} aria-hidden />
          {p.status === 'succeeded'
            ? 'Finished'
            : p.status === 'timeout'
              ? 'Timed out'
              : p.status === 'skipped'
                ? 'Skipped'
                : 'Failed'}
        </span>
        <span className="flex items-center gap-2">
          {p.label ? (
            <span className="rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
              Spoke as Participant {p.label}
            </span>
          ) : null}
          {onRetry && p.status !== 'succeeded' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry(p.id)}
              title="Rerun this participant's take, then re-synthesize the verdict"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Rerun
            </Button>
          ) : null}
        </span>
      </div>
      {p.error && p.status !== 'succeeded' ? (
        <p className="text-sm text-destructive">{p.error}</p>
      ) : null}
      {p.output ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
          {p.output}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No output captured.</p>
      )}
    </div>
  );
}

function VerdictPanel({
  run,
  onSkip,
  onRetryVerdict,
}: {
  run: CouncilRun;
  onSkip?: (runParticipantId: string) => void;
  onRetryVerdict?: () => void;
}) {
  if (run.status === 'running') {
    const waiting = run.participants.filter((p) => p.status === 'running');
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting on {waiting.length} participant{waiting.length === 1 ? '' : 's'}…
        </div>
        <ul className="space-y-1.5">
          {waiting.map((p, i) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT.running)} aria-hidden />
              <AgentCliLogo cli={p.provider} className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">
                {p.name.trim() || `Participant ${i + 1}`}
                <span className="text-muted-foreground"> · {p.provider}</span>
              </span>
              {onSkip ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(p.id)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Stop waiting on this participant — the verdict proceeds without it"
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
    const judge = run.verdictProvider ? AGENT_CLI_LABEL[run.verdictProvider] : 'The judge';
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {run.verdictProvider ? <AgentCliLogo cli={run.verdictProvider} className="h-4 w-4" /> : null}
          Synthesizing — {judge} is weighing the anonymized takes…
        </div>
        {run.verdictTerminalId ? (
          <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
            <LiveTerminal
              attachId={run.verdictTerminalId}
              label={`Verdict · ${judge}`}
              ariaLabel="Verdict terminal"
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
        {onRetryVerdict ? (
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={onRetryVerdict}>
              <RotateCcw className="h-3.5 w-3.5" />
              Rerun verdict
            </Button>
            <p className="text-xs text-muted-foreground">
              Re-judges the saved outputs with the provider selected in the panel — participants
              don't rerun. Rerun individual participants from their tabs.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  const labeled = run.participants
    .filter((p) => p.label)
    .sort((a, b) => (a.label ?? '').localeCompare(b.label ?? ''));

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
      {labeled.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {labeled.map((p, i) => (
            <span
              key={p.id}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">Participant {p.label}</span>
              <AgentCliLogo cli={p.provider} className="h-3 w-3" />
              {p.name.trim() || `Participant ${i + 1}`}
            </span>
          ))}
        </div>
      ) : null}
      {run.verdict ? (
        <MarkdownPreview content={run.verdict} />
      ) : (
        <p className="text-sm text-muted-foreground">No verdict recorded.</p>
      )}
    </div>
  );
}
