'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Library,
  Loader2,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  AGENT_CLIS,
  AGENT_CLI_LABEL,
  MAX_GLOBAL_SOURCES,
  type AgentCli,
  type AgentCliStatus,
  type AgentsConfig,
  type CliTerminalAction,
  type GlobalSource,
  type PrimaryAgent,
  type SubAgent,
  type UpdatePrimaryAgentRequest,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { CliActionModal } from '@/components/cli-action-modal';
import { SourceIcon } from '@/components/source-icon';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  addKnowledgeSource,
  createSubAgent,
  deleteSubAgent,
  getAgentsConfig,
  getCliStatus,
  getKnowledgeSources,
  removeKnowledgeSource,
  updateAgentCli,
  updatePrimaryAgent,
  updateSubAgent,
} from '@/lib/api';
import { formatHeartbeatInterval } from '@/lib/app-settings';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';

const SAVE_DEBOUNCE_MS = 600;

const CLI_OPTIONS: SelectOption<AgentCli>[] = AGENT_CLIS.map((cli) => ({
  value: cli,
  label: AGENT_CLI_LABEL[cli],
  icon: <AgentCliLogo cli={cli} className="h-4 w-4" />,
}));

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function AgentsView() {
  const [agents, setAgents] = useState<AgentsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Install status for the currently-selected CLI, plus the open install/uninstall modal.
  const [cliStatus, setCliStatus] = useState<AgentCliStatus | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [cliAction, setCliAction] = useState<{ cli: AgentCli; action: CliTerminalAction } | null>(
    null,
  );
  const confirm = useConfirm();

  // A ref mirror of the latest config so debounced saves read fresh values
  // rather than a stale closure.
  const latest = useRef<AgentsConfig | null>(null);
  latest.current = agents;

  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const primaryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const subTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    getAgentsConfig().then(setAgents).catch((e) => setError(errMsg(e)));
  }, []);

  // Clear every pending timer on unmount.
  useEffect(() => {
    const timers = subTimers.current;
    return () => {
      clearTimeout(savedTimer.current);
      clearTimeout(primaryTimer.current);
      for (const t of timers.values()) clearTimeout(t);
    };
  }, []);

  // Probe whether the selected CLI is installed (and its version). Re-runs when
  // the selection changes and after the install modal closes.
  const selectedCli = agents?.cli ?? null;
  const refreshCliStatus = () => {
    if (!selectedCli) return;
    setStatusBusy(true);
    getCliStatus(selectedCli)
      .then(setCliStatus)
      .catch(() => setCliStatus(null))
      .finally(() => setStatusBusy(false));
  };
  useEffect(() => {
    if (!selectedCli) return;
    let cancelled = false;
    setStatusBusy(true);
    setCliStatus(null);
    getCliStatus(selectedCli)
      .then((s) => {
        if (!cancelled) setCliStatus(s);
      })
      .catch(() => {
        if (!cancelled) setCliStatus(null);
      })
      .finally(() => {
        if (!cancelled) setStatusBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCli]);

  const flashSaved = () => {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
  };

  const schedulePrimarySave = () => {
    clearTimeout(primaryTimer.current);
    primaryTimer.current = setTimeout(() => {
      const p = latest.current?.primary;
      if (!p) return;
      // Omit the heartbeat interval (owned by Settings) so we don't clobber it,
      // and omit an empty name (it's required server-side — keep the last good one).
      const body: UpdatePrimaryAgentRequest = {
        description: p.description,
        heartbeatEnabled: p.heartbeatEnabled,
        heartbeatPrompt: p.heartbeatPrompt,
      };
      if (p.name.trim()) body.name = p.name;
      updatePrimaryAgent(body)
        .then(flashSaved)
        .catch((e) => setError(errMsg(e)));
    }, SAVE_DEBOUNCE_MS);
  };

  const scheduleSubSave = (id: string) => {
    const existing = subTimers.current.get(id);
    if (existing) clearTimeout(existing);
    subTimers.current.set(
      id,
      setTimeout(() => {
        const sub = latest.current?.subAgents.find((s) => s.id === id);
        if (!sub) return;
        updateSubAgent(id, { name: sub.name, role: sub.role, description: sub.description })
          .then(flashSaved)
          .catch((e) => setError(errMsg(e)));
      }, SAVE_DEBOUNCE_MS),
    );
  };

  const editPrimary = (patch: Partial<PrimaryAgent>) => {
    setAgents((prev) => (prev ? { ...prev, primary: { ...prev.primary, ...patch } } : prev));
    schedulePrimarySave();
  };

  // A single discrete choice — save it straight away rather than debouncing.
  const editCli = (cli: AgentCli) => {
    setAgents((prev) => (prev ? { ...prev, cli } : prev));
    updateAgentCli(cli)
      .then(flashSaved)
      .catch((e) => setError(errMsg(e)));
  };

  const editSubAgent = (id: string, patch: Partial<SubAgent>) => {
    setAgents((prev) =>
      prev
        ? { ...prev, subAgents: prev.subAgents.map((s) => (s.id === id ? { ...s, ...patch } : s)) }
        : prev,
    );
    scheduleSubSave(id);
  };

  const addSubAgent = async () => {
    try {
      const created = await createSubAgent({});
      setAgents((prev) => (prev ? { ...prev, subAgents: [...prev.subAgents, created] } : prev));
      flashSaved();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const removeSubAgent = async (id: string) => {
    const sub = latest.current?.subAgents.find((s) => s.id === id);
    const ok = await confirm({
      title: 'Remove this subagent?',
      description: `${sub?.name.trim() || 'This subagent'} will be deleted and the orchestrator can no longer delegate to it.`,
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    const t = subTimers.current.get(id);
    if (t) clearTimeout(t);
    subTimers.current.delete(id);
    try {
      await deleteSubAgent(id);
      setAgents((prev) =>
        prev ? { ...prev, subAgents: prev.subAgents.filter((s) => s.id !== id) } : prev,
      );
    } catch (e) {
      setError(errMsg(e));
    }
  };

  if (!agents) {
    return (
      <div className="container max-w-3xl py-2">
        <p className="text-sm text-muted-foreground">
          {error ? `Couldn't load agents: ${error}` : 'Loading…'}
        </p>
      </div>
    );
  }

  const { cli, primary, subAgents } = agents;

  return (
    <div className="container max-w-3xl space-y-4 py-2">
      <div
        className={cn(
          'flex items-center justify-end gap-1.5 text-xs text-muted-foreground transition-opacity',
          saved ? 'opacity-100' : 'opacity-0',
        )}
        aria-live="polite"
      >
        <Check className="h-3.5 w-3.5" />
        Saved
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Accordion title="Agent CLI" icon={<Terminal className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium">Preferred CLI</p>
              <p className="text-xs text-muted-foreground">
                The coding agent launched in a session terminal — it runs automatically the first
                time you open a session, after cd-ing into the project&apos;s working directory.
              </p>
            </div>
            <Select
              options={CLI_OPTIONS}
              value={cli}
              onChange={editCli}
              aria-label="Preferred agent CLI"
              className="w-40 shrink-0"
            />
          </div>

          <CliStatusRow
            cli={cli}
            status={cliStatus}
            busy={statusBusy}
            onAction={(action) => setCliAction({ cli, action })}
          />
        </div>
      </Accordion>

      <Accordion title="Primary Agent" icon={<Bot className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-5 p-5">
          <Field label="Name" htmlFor="primary-name">
            <Input
              id="primary-name"
              value={primary.name}
              onChange={(e) => editPrimary({ name: e.target.value })}
              placeholder="Orchestrator"
            />
          </Field>

          <MarkdownField
            label="Description / prompt"
            hint="The orchestrator's system prompt — how it should plan, delegate and decide what to work on."
            value={primary.description}
            onChange={(v) => editPrimary({ description: v })}
            placeholder="You are the orchestrator. You triage incoming work, break it into tasks…"
          />

          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Activity className="h-3.5 w-3.5" />
                  Heartbeat
                </p>
                <p className="text-xs text-muted-foreground">
                  A prompt the orchestrator runs on a schedule — for sweeps, check-ins or any
                  standing task. Runs{' '}
                  <span className="font-medium text-foreground">
                    {formatHeartbeatInterval(primary.heartbeatIntervalH).toLowerCase()}
                  </span>{' '}
                  · change the cadence in{' '}
                  <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
                    Settings
                  </Link>
                  .
                </p>
              </div>
              <Switch
                checked={primary.heartbeatEnabled}
                onCheckedChange={(on) => editPrimary({ heartbeatEnabled: on })}
                aria-label="Enable heartbeat"
              />
            </div>

            <div
              className={cn(
                'transition-opacity',
                primary.heartbeatEnabled ? 'opacity-100' : 'pointer-events-none opacity-50',
              )}
            >
              <MarkdownField
                label="Heartbeat prompt"
                value={primary.heartbeatPrompt}
                onChange={(v) => editPrimary({ heartbeatPrompt: v })}
                placeholder="Review open tasks and surface anything that's stalled or needs a decision…"
                minHeight={100}
              />
            </div>
          </div>
        </div>
      </Accordion>

      <KnowledgeBaseSection />

      <Accordion
        title="Sub Agents"
        icon={<Users className="h-3.5 w-3.5" />}
        count={subAgents.length}
        defaultOpen
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              void addSubAgent();
            }}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      >
        <div className="space-y-4 p-5">
          {subAgents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No subagents yet. Add focused workers the orchestrator can delegate to.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void addSubAgent()}>
                <Plus className="h-4 w-4" />
                Add subagent
              </Button>
            </div>
          ) : (
            subAgents.map((sub, i) => (
              <SubAgentCard
                key={sub.id}
                index={i}
                subAgent={sub}
                onChange={(patch) => editSubAgent(sub.id, patch)}
                onRemove={() => void removeSubAgent(sub.id)}
              />
            ))
          )}
        </div>
      </Accordion>

      {cliAction ? (
        <CliActionModal
          cli={cliAction.cli}
          action={cliAction.action}
          onClose={() => {
            setCliAction(null);
            // The user may have just installed/uninstalled — re-probe so the row updates.
            refreshCliStatus();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * The global knowledge base: link sources shared with every project (on top of
 * each project's own sources). Mirrors the project sources UI — paste a URL, the
 * gateway extracts the favicon + title from Open Graph.
 */
function KnowledgeBaseSection() {
  const [sources, setSources] = useState<GlobalSource[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const confirm = useConfirm();

  useEffect(() => {
    getKnowledgeSources()
      .then(setSources)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoaded(true));
  }, []);

  const atLimit = sources.length >= MAX_GLOBAL_SOURCES;

  const add = async () => {
    const u = url.trim();
    if (!u) return;
    try {
      new URL(u);
    } catch {
      setError('Enter a full URL, including https://');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setSources(await addKnowledgeSource(u));
      setUrl('');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will no longer be shared with your projects.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setBusy(true);
    try {
      setSources(await removeKnowledgeSource(id));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Accordion
      title="Knowledge Base"
      icon={<Library className="h-3.5 w-3.5" />}
      count={sources.length}
      defaultOpen
    >
      <div className="space-y-3 p-5">
        <p className="text-xs text-muted-foreground">
          Links shared with every project, on top of its own sources. A project&apos;s own source
          for the same link takes precedence.
        </p>

        <div className="flex items-center gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void add();
              }
            }}
            placeholder="Paste a GitHub, Notion, Google Docs or any link"
            disabled={atLimit || busy}
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => void add()}
            disabled={atLimit || busy || !url.trim()}
            aria-label="Add source"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        {loaded && sources.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No global sources yet — add links your agents should always have on hand.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
              >
                <SourceIcon kind={s.kind} faviconUrl={s.faviconUrl} />
                <span className="min-w-0 flex-1 truncate text-sm">{s.title ?? s.url}</span>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open source in new tab"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  disabled={busy}
                  aria-label="Remove source"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Accordion>
  );
}

/** Installed/version badge for the selected CLI, with install / update / uninstall buttons. */
function CliStatusRow({
  cli,
  status,
  busy,
  onAction,
}: {
  cli: AgentCli;
  status: AgentCliStatus | null;
  busy: boolean;
  onAction: (action: CliTerminalAction) => void;
}) {
  const label = AGENT_CLI_LABEL[cli];
  const installed = status?.installed ?? false;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <AgentCliLogo cli={cli} className="h-4 w-4 shrink-0" />
        {busy ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Checking {label}…
          </span>
        ) : installed ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'hsl(142 71% 45%)' }}
            />
            <span className="font-medium">{label} installed</span>
            {status?.version ? (
              <span className="truncate font-mono text-muted-foreground">{status.version}</span>
            ) : null}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: 'hsl(0 72% 55%)' }}
            />
            <span className="font-medium">{label} not found</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {installed ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onAction('uninstall')}
            disabled={busy}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Uninstall
          </Button>
        ) : null}
        <Button
          type="button"
          variant={installed ? 'outline' : 'default'}
          size="sm"
          onClick={() => onAction('install')}
          disabled={busy}
        >
          {installed ? (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              Reinstall / Update
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Install
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SubAgentCard({
  index,
  subAgent,
  onChange,
  onRemove,
}: {
  index: number;
  subAgent: SubAgent;
  onChange: (patch: Partial<SubAgent>) => void;
  onRemove: () => void;
}) {
  // Start expanded only when the subagent is still blank (e.g. just added),
  // so existing ones stay collapsed and the list reads as a compact accordion.
  const [open, setOpen] = useState(
    () => !subAgent.name.trim() && !subAgent.role.trim() && !subAgent.description.trim(),
  );

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Collapse subagent' : 'Expand subagent'}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')}
          />
        </button>
        <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          #{index + 1}
        </span>
        <input
          value={subAgent.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={`Subagent ${index + 1}`}
          aria-label="Subagent name"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-0"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Remove subagent"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-border/60 p-4">
          <Field label="Role" htmlFor={`sub-role-${subAgent.id}`}>
            <Input
              id={`sub-role-${subAgent.id}`}
              value={subAgent.role}
              onChange={(e) => onChange({ role: e.target.value })}
              placeholder="Condenses long threads into a brief"
            />
          </Field>

          <MarkdownField
            label="Description"
            hint="The full system prompt for this subagent."
            value={subAgent.description}
            onChange={(v) => onChange({ description: v })}
            placeholder="You are a summariser. Given a transcript, produce a tight, faithful summary…"
          />
        </div>
      ) : null}
    </section>
  );
}

/** A long-form text field with a toggle between a compact box and a roomy,
 *  monospace markdown editor for writing the agent's prompt. */
function MarkdownField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [markdown, setMarkdown] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{label}</label>
        <button
          type="button"
          onClick={() => setMarkdown((m) => !m)}
          aria-pressed={markdown}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
            markdown
              ? 'border-foreground/20 bg-accent text-accent-foreground'
              : 'border-border/60 text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Markdown
        </button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={!markdown}
        className={cn('resize-y', markdown && 'font-mono text-xs leading-relaxed')}
        style={{ minHeight: markdown ? Math.max(minHeight, 240) : minHeight }}
      />
      {markdown ? (
        <p className="text-[11px] text-muted-foreground/70">
          Markdown mode — written as the agent&apos;s prompt document.
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Accordion({
  title,
  icon,
  count,
  action,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon?: ReactNode;
  count?: number;
  action?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-lg border bg-card/60">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              !open && '-rotate-90',
            )}
          />
          {icon ? <span className="shrink-0 text-muted-foreground">{icon}</span> : null}
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {typeof count === 'number' ? (
            <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {open ? <div className="border-t border-border/60">{children}</div> : null}
    </section>
  );
}
