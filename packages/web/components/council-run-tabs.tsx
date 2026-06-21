'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, RotateCcw, Sparkles, SkipForward } from 'lucide-react';
import {
  AGENT_CLI_LABEL,
  COUNCIL_FORMATS_META,
  type CouncilFormat,
  type CouncilRun,
  type CouncilRunMember,
  type CouncilSynthesisEntry,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { ExportMenu } from '@/components/export-menu';
import { MarkdownPreview } from '@/components/markdown-preview';
import { Spinner } from '@/components/spinner';
import { StyledSelect } from '@/components/ui/styled-select';
import { exportCouncilRunMarkdown } from '@/lib/api';
import { captureMarkdownHtml } from '@/lib/capture-markdown-html';
import {
  buildCouncilRunHtml,
  councilHtmlExportFilename,
  type LegendEntry,
  type MemberView,
  type SynthesisHtmlEntry,
} from '@/lib/council-html-export';
import { FORMAT_SELECT_OPTIONS, formatIcon } from '@/lib/council-formats';
import { cn } from '@/lib/utils';

// xterm touches `window` — client-only, like SessionTerminal.
const LiveTerminal = dynamic(
  () => import('@/components/live-terminal').then((m) => m.LiveTerminal),
  { ssr: false },
);

const STATUS_DOT: Record<CouncilRunMember['status'], string> = {
  running: 'bg-blue-500 animate-pulse',
  succeeded: 'bg-emerald-500',
  failed: 'bg-destructive',
  timeout: 'bg-amber-500',
  skipped: 'bg-muted-foreground/60',
};

/** The looping highlight sweep on a still-running member's tab (reuses the
 *  screensaver's pill-shimmer keyframes). */
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

/** Member status → the same label the in-app MemberOutput shows. */
const MEMBER_STATUS_LABEL: Record<CouncilRunMember['status'], string> = {
  running: 'Running',
  succeeded: 'Finished',
  failed: 'Failed',
  timeout: 'Timed out',
  skipped: 'Skipped',
};

/**
 * The main panel of a council run: one tab per member (live terminal while
 * running, persisted output after) plus the Synthesis tab. Terminals stay
 * mounted-but-hidden across tab switches so their sockets and scrollback
 * survive; the run id keys the whole strip so a new run starts fresh.
 */
export function CouncilRunTabs({
  councilId,
  councilName,
  run,
  onSkip,
  onRetryMember,
  onReSynthesize,
}: {
  councilId: string;
  /** The council's name — used as the header/title of the HTML export. */
  councilName: string;
  run: CouncilRun;
  /** Skip a still-running member (live runs only — absent for past runs). */
  onSkip?: (runMemberId: string) => void;
  /** Rerun a settled member (finished runs only). */
  onRetryMember?: (runMemberId: string) => void;
  /** Re-synthesize the captured responses in a (possibly new) format (finished runs only). */
  onReSynthesize?: (format: CouncilFormat) => void;
}) {
  const [active, setActive] = useState<string>(run.members[0]?.id ?? SYNTH_TAB);

  // Export is meaningful once a run has settled (it has captured responses and/or
  // a synthesis to serialize); hidden while it's still running or synthesizing.
  const canExport = run.status === 'completed' || run.status === 'failed';

  // Jump to the synthesis once it starts — the responses themselves are over.
  useEffect(() => {
    if (run.status === 'synthesizing' || run.status === 'completed') setActive(SYNTH_TAB);
  }, [run.status]);

  const activeMember = run.members.find((m) => m.id === active) ?? null;

  // Assemble the self-contained interactive HTML export from the structured run.
  // Synthesis markdown is converted to HTML via a hidden render-and-capture; the
  // builder (lib/council-html-export) handles escaping and the document shell.
  const buildHtml = useCallback(async (): Promise<{ filename: string; html: string }> => {
    const members: MemberView[] = run.members.map((m, i) => ({
      name: m.name.trim() || `Member ${i + 1}`,
      role: m.role,
      providerLabel: AGENT_CLI_LABEL[m.provider],
      statusLabel: MEMBER_STATUS_LABEL[m.status],
      statusKey: m.status,
      output: m.output ?? null,
      error: m.error ?? null,
    }));

    // Settled syntheses (one per format), with the legacy single-synthesis
    // fallback — mirrors SynthesisPanel's `archive`. Active format first.
    const archive: CouncilSynthesisEntry[] = run.syntheses.length
      ? run.syntheses
      : run.synthesis
        ? [
            {
              format: run.format,
              synthesis: run.synthesis,
              synthProvider: run.synthProvider,
              anonymized: false,
              finishedAt: run.finishedAt ?? '',
            },
          ]
        : [];
    const ordered = [
      ...archive.filter((e) => e.format === run.format),
      ...archive.filter((e) => e.format !== run.format),
    ];

    const legendFor = (entry: CouncilSynthesisEntry): LegendEntry[] => {
      if (!entry.anonymized || !entry.labelMap) return [];
      return Object.entries(entry.labelMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, runMemberId]) => {
          const index = run.members.findIndex((m) => m.id === runMemberId);
          const member = run.members[index];
          return {
            label,
            name: member?.name.trim() || `Member ${index >= 0 ? index + 1 : ''}`.trim(),
            providerLabel: member ? AGENT_CLI_LABEL[member.provider] : '',
          };
        });
    };

    const syntheses: SynthesisHtmlEntry[] = [];
    for (const entry of ordered) {
      syntheses.push({
        format: entry.format,
        label: COUNCIL_FORMATS_META[entry.format].label,
        bodyHtml: await captureMarkdownHtml(entry.synthesis),
        isActive: entry.format === run.format,
        legend: legendFor(entry),
      });
    }

    const html = buildCouncilRunHtml({
      councilName,
      prompt: run.prompt,
      exportedAt: new Date(),
      formatLabel: COUNCIL_FORMATS_META[run.format].label,
      synthProviderLabel: run.synthProvider ? AGENT_CLI_LABEL[run.synthProvider] : null,
      members,
      syntheses,
    });
    const date = (run.finishedAt ?? run.startedAt).slice(0, 10);
    return { filename: councilHtmlExportFilename(councilName, run.format, date), html };
  }, [councilName, run]);

  return (
    <div className="flex flex-col gap-3">
      {/* Prompt + tab strip stay pinned to the top while the output scrolls
          beneath them. Same border as the sticky page header, but near-opaque
          (vs PageHeader's frosted 60–80%) — prose scrolls directly beneath
          this strip and must not stay readable through it. */}
      <div className="sticky top-[52px] z-20 -mx-1 flex flex-col gap-2 border-b border-border/60 bg-background/95 px-1 pb-2 pt-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Prompt: <span className="text-foreground">{run.prompt}</span>
        </p>
        <div role="tablist" aria-label="Council run" className="flex flex-wrap items-center gap-1.5">
          {run.members.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active === m.id}
              onClick={() => setActive(m.id)}
              className={cn(
                'relative flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active === m.id
                  ? 'border-foreground/20 bg-accent text-accent-foreground'
                  : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              {m.status === 'running' ? <TabShimmer /> : null}
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[m.status])} aria-hidden />
              <AgentCliLogo cli={m.provider} className="h-3.5 w-3.5" />
              {m.name.trim() || `Member ${i + 1}`}
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
          {canExport ? (
            <ExportMenu
              className="ml-auto"
              filename={`${COUNCIL_FORMATS_META[run.format].label.toLowerCase()}-${run.id.slice(0, 8)}`}
              fetchMarkdown={() => exportCouncilRunMarkdown(councilId, run.id)}
              buildHtml={buildHtml}
            />
          ) : null}
        </div>
      </div>

      {/* Live terminals stay mounted (hidden) so a tab switch doesn't drop the WS. */}
      {run.members.map((m, i) =>
        m.status === 'running' ? (
          <div key={m.id} className={cn('space-y-2', active !== m.id && 'hidden')}>
            {onSkip ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSkip(m.id)}
                  title="Stop waiting on this member — the synthesis proceeds without it"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  Skip member
                </Button>
              </div>
            ) : null}
            <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
              <LiveTerminal
                attachId={m.terminalId}
                label={`${m.name.trim() || `Member ${i + 1}`} · ${m.provider}`}
                ariaLabel={`${m.name.trim() || `Member ${i + 1}`} terminal`}
                loaderUntilOutput
              />
            </div>
          </div>
        ) : null,
      )}

      {activeMember && activeMember.status !== 'running' ? (
        <MemberOutput member={activeMember} onRetry={onRetryMember} />
      ) : null}

      {active === SYNTH_TAB ? (
        <SynthesisPanel run={run} onSkip={onSkip} onReSynthesize={onReSynthesize} />
      ) : null}
    </div>
  );
}

function MemberOutput({
  member: m,
  onRetry,
}: {
  member: CouncilRunMember;
  onRetry?: (runMemberId: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[m.status])} aria-hidden />
          {m.role.trim() ? <span className="text-foreground">{m.role.trim()}</span> : null}
          <span>
            {m.status === 'succeeded'
              ? 'Finished'
              : m.status === 'timeout'
                ? 'Timed out'
                : m.status === 'skipped'
                  ? 'Skipped'
                  : 'Failed'}
          </span>
        </span>
        {onRetry && m.status !== 'succeeded' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRetry(m.id)}
            title="Rerun this member, then re-synthesize"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Rerun
          </Button>
        ) : null}
      </div>
      {m.error && m.status !== 'succeeded' ? (
        <p className="text-sm text-destructive">{m.error}</p>
      ) : null}
      {m.output ? (
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
          {m.output}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No output captured.</p>
      )}
    </div>
  );
}

/** The format picker + button shown on finished runs to re-synthesize the same
 *  captured responses in a (possibly new) format. */
function ReSynthesizeControl({
  run,
  onReSynthesize,
}: {
  run: CouncilRun;
  onReSynthesize: (format: CouncilFormat) => void;
}) {
  const [format, setFormat] = useState<CouncilFormat>(run.format);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StyledSelect
        aria-label="Synthesis format"
        className="w-44"
        options={FORMAT_SELECT_OPTIONS}
        value={format}
        onChange={setFormat}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onReSynthesize(format)}>
        <RotateCcw className="h-3.5 w-3.5" />
        Re-synthesize
      </Button>
      <p className="text-xs text-muted-foreground">
        Re-runs only the synthesis over the captured responses — switch formats freely; members
        don&apos;t re-run.
      </p>
    </div>
  );
}

function SynthesisPanel({
  run,
  onSkip,
  onReSynthesize,
}: {
  run: CouncilRun;
  onSkip?: (runMemberId: string) => void;
  onReSynthesize?: (format: CouncilFormat) => void;
}) {
  // Re-synthesis re-distils the *captured* responses, so it's only meaningful when
  // at least one member produced one (a completed run always has them; a run that
  // failed at the response stage does not — rerun a member instead).
  const hasOutputs = run.members.some((m) => m.status === 'succeeded');

  if (run.status === 'running') {
    const waiting = run.members.filter((m) => m.status === 'running');
    return (
      <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting on {waiting.length} member{waiting.length === 1 ? '' : 's'}…
        </div>
        <ul className="space-y-1.5">
          {waiting.map((m, i) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT.running)} aria-hidden />
              <AgentCliLogo cli={m.provider} className="h-3.5 w-3.5" />
              <span className="min-w-0 truncate">
                {m.name.trim() || `Member ${i + 1}`}
                <span className="text-muted-foreground"> · {m.provider}</span>
              </span>
              {onSkip ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSkip(m.id)}
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Stop waiting on this member — the synthesis proceeds without it"
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
          Synthesizing ({COUNCIL_FORMATS_META[run.format].label}) — {synth} is distilling the
          responses…
        </div>
        {run.synthTerminalId ? (
          <div className="h-[420px] overflow-hidden rounded-lg border border-border/60">
            <LiveTerminal
              attachId={run.synthTerminalId}
              label={`Synthesis · ${synth}`}
              ariaLabel="Synthesis terminal"
              loaderUntilOutput
            />
          </div>
        ) : (
          <div className="flex h-[420px] items-center justify-center rounded-lg border border-border/60">
            <Spinner />
          </div>
        )}
      </div>
    );
  }

  // Settled (completed or failed). Show every archived synthesis (one per format);
  // a failed re-synthesis still shows the formats that previously succeeded. Fall
  // back to the single active `synthesis` for runs predating per-format archiving.
  const archive: CouncilSynthesisEntry[] = run.syntheses.length
    ? run.syntheses
    : run.synthesis
      ? [
          {
            format: run.format,
            synthesis: run.synthesis,
            synthProvider: run.synthProvider,
            anonymized: false,
            finishedAt: run.finishedAt ?? '',
          },
        ]
      : [];

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
      {run.status === 'failed' ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive break-words">
          {run.error ?? 'The run failed.'}
        </div>
      ) : null}
      {onReSynthesize && hasOutputs ? (
        <ReSynthesizeControl run={run} onReSynthesize={onReSynthesize} />
      ) : null}
      {archive.length ? (
        <SynthesisArchive run={run} entries={archive} activeFormat={run.format} />
      ) : run.status !== 'failed' ? (
        <p className="text-sm text-muted-foreground">No synthesis recorded.</p>
      ) : null}
    </div>
  );
}

/** Format chips over the archived syntheses; selecting one shows its markdown,
 *  with a de-anonymization legend above it for anonymized formats. */
function SynthesisArchive({
  run,
  entries,
  activeFormat,
}: {
  run: CouncilRun;
  entries: CouncilSynthesisEntry[];
  activeFormat: CouncilFormat;
}) {
  // Default to the active (most-recent) format if present, else the first entry.
  const [selected, setSelected] = useState<CouncilFormat>(
    entries.some((e) => e.format === activeFormat) ? activeFormat : entries[0]!.format,
  );
  const entry = entries.find((e) => e.format === selected) ?? entries[0]!;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map((e) => {
          const Icon = formatIcon(e.format);
          return (
            <button
              key={e.format}
              type="button"
              onClick={() => setSelected(e.format)}
              aria-pressed={e.format === entry.format}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                e.format === entry.format
                  ? 'border-foreground/20 bg-accent text-accent-foreground'
                  : 'border-border/60 text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="h-3 w-3" />
              {COUNCIL_FORMATS_META[e.format].label}
            </button>
          );
        })}
      </div>
      <DeAnonLegend run={run} entry={entry} />
      <MarkdownPreview content={entry.synthesis} />
    </div>
  );
}

/** For an anonymized synthesis, maps each blind label (A/B/C) back to the member
 *  that spoke as it — how the user de-anonymizes a debate after the fact. Renders
 *  nothing for attributed (non-anonymized) formats. */
function DeAnonLegend({ run, entry }: { run: CouncilRun; entry: CouncilSynthesisEntry }) {
  const pairs = useMemo(() => {
    if (!entry.anonymized || !entry.labelMap) return [];
    return Object.entries(entry.labelMap).sort(([a], [b]) => a.localeCompare(b));
  }, [entry]);

  if (pairs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pairs.map(([label, runMemberId]) => {
        const member = run.members.find((m) => m.id === runMemberId);
        const index = run.members.findIndex((m) => m.id === runMemberId);
        const name = member?.name.trim() || `Member ${index >= 0 ? index + 1 : ''}`.trim();
        return (
          <span
            key={label}
            className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground">Member {label}</span>
            <span aria-hidden>=</span>
            {member ? <AgentCliLogo cli={member.provider} className="h-3 w-3" /> : null}
            {name}
          </span>
        );
      })}
    </div>
  );
}
