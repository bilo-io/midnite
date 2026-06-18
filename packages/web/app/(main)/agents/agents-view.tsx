'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  Cpu,
  FileText,
  Library,
  Plus,
  Terminal,
  Trash2,
  Users,
} from 'lucide-react';
import {
  AGENT_CLIS,
  AGENT_CLI_LABEL,
  CLI_PROVIDER_MAP,
  LLM_PROVIDERS,
  LLM_PROVIDER_LABEL,
  MAX_GLOBAL_SOURCES,
  type AgentCli,
  type AgentCliStatus,
  type AgentsConfig,
  type CliTerminalAction,
  type GlobalSource,
  type LlmProvider,
  type PrimaryAgent,
  type ProvidersResponse,
  type SubAgent,
  type UpdatePrimaryAgentRequest,
  type UpdateProviderCredentialRequest,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Tabs, type TabOption } from '@/components/ui/tabs';
import { AgentCard } from '@/components/agent-card';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { CliActionModal } from '@/components/cli-action-modal';
import { SourceListEditor, orderByIds } from '@/components/source-list-editor';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  addKnowledgeSource,
  createSubAgent,
  deleteSubAgent,
  getAgentsConfig,
  getCliStatuses,
  getKnowledgeSources,
  getProviders,
  removeKnowledgeSource,
  reorderKnowledgeSources,
  setActiveProvider as apiSetActiveProvider,
  updateAgentCli,
  updatePrimaryAgent,
  updateProvider,
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

const PROVIDER_OPTIONS: SelectOption<LlmProvider>[] = LLM_PROVIDERS.map((p) => ({
  value: p,
  label: LLM_PROVIDER_LABEL[p],
}));

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function AgentsView() {
  const [agents, setAgents] = useState<AgentsConfig | null>(null);
  const [statuses, setStatuses] = useState<AgentCliStatus[]>([]);
  const [statusBusy, setStatusBusy] = useState(true);
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cliAction, setCliAction] = useState<{ cli: AgentCli; action: CliTerminalAction } | null>(
    null,
  );
  const confirm = useConfirm();

  // A ref mirror of the latest config so debounced saves read fresh values.
  const latest = useRef<AgentsConfig | null>(null);
  latest.current = agents;

  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const primaryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const subTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    getAgentsConfig().then(setAgents).catch((e) => setError(errMsg(e)));
    getProviders().then(setProviders).catch((e) => setError(errMsg(e)));
  }, []);

  const refreshCliStatuses = () => {
    setStatusBusy(true);
    getCliStatuses()
      .then(setStatuses)
      .catch(() => setStatuses([]))
      .finally(() => setStatusBusy(false));
  };
  useEffect(() => {
    let cancelled = false;
    setStatusBusy(true);
    getCliStatuses()
      .then((s) => !cancelled && setStatuses(s))
      .catch(() => !cancelled && setStatuses([]))
      .finally(() => !cancelled && setStatusBusy(false));
    return () => {
      cancelled = true;
    };
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

  // --- Provider (API) handlers ---

  const saveProvider = async (provider: LlmProvider, body: UpdateProviderCredentialRequest) => {
    const resp = await updateProvider(provider, body);
    setProviders((prev) =>
      prev
        ? {
            activeProvider: resp.activeProvider,
            providers: prev.providers.map((p) => (p.provider === provider ? resp.provider : p)),
          }
        : prev,
    );
    flashSaved();
  };

  const activateProvider = async (provider: LlmProvider) => {
    setProviders(await apiSetActiveProvider(provider));
    flashSaved();
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
  const activeProvider = providers?.activeProvider ?? null;
  const providerCredFor = (provider: LlmProvider | null) =>
    provider ? providers?.providers.find((p) => p.provider === provider) : undefined;

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

      <Accordion title="Primary Agent" icon={<Bot className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-5 p-5">
          <PrimaryAgentRouting
            cli={cli}
            activeProvider={activeProvider}
            onSetCli={editCli}
            onSetProvider={(p) => void activateProvider(p)}
          />

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

      <Accordion title="Agents" icon={<Cpu className="h-3.5 w-3.5" />} count={AGENT_CLIS.length} defaultOpen>
        <div className="space-y-3 p-5">
          <p className="text-xs text-muted-foreground">
            Every coding agent midnite knows about. Expand one to install or update its CLI (used to
            run task sessions) or, under the API tab, add your own key so that provider can power
            midnite&apos;s own AI features.
          </p>
          {AGENT_CLIS.map((c) => {
            const provider = CLI_PROVIDER_MAP[c];
            return (
              <AgentCard
                key={c}
                cli={c}
                status={statuses.find((s) => s.cli === c)}
                statusBusy={statusBusy}
                isActiveCli={cli === c}
                providerCred={providerCredFor(provider)}
                isActiveProvider={provider != null && activeProvider === provider}
                onSetActiveCli={() => editCli(c)}
                onInstallAction={(action) => setCliAction({ cli: c, action })}
                onSaveProvider={(body) => saveProvider(provider!, body)}
                onSetActiveProvider={() => activateProvider(provider!)}
              />
            );
          })}
        </div>
      </Accordion>

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
            <EmptyState
              Icon={Bot}
              title="No subagents yet"
              description="Add focused workers the orchestrator can delegate to."
              actionLabel="Add subagent"
              onAction={() => void addSubAgent()}
            />
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

      <KnowledgeBaseSection />

      {cliAction ? (
        <CliActionModal
          cli={cliAction.cli}
          action={cliAction.action}
          onClose={() => {
            setCliAction(null);
            // The user may have just installed/uninstalled — re-probe so rows update.
            refreshCliStatuses();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * The two global selectors for the primary agent, under API / CLI tabs: which CLI
 * runs sessions, and which provider powers the gateway's AI. Per-key configuration
 * lives in each agent's card below.
 */
function PrimaryAgentRouting({
  cli,
  activeProvider,
  onSetCli,
  onSetProvider,
}: {
  cli: AgentCli;
  activeProvider: LlmProvider | null;
  onSetCli: (cli: AgentCli) => void;
  onSetProvider: (provider: LlmProvider) => void;
}) {
  const [tab, setTab] = useState<'cli' | 'api'>('cli');
  const tabs: TabOption<'cli' | 'api'>[] = [
    { value: 'cli', label: 'CLI', icon: <Terminal className="h-3.5 w-3.5" /> },
    { value: 'api', label: 'API', icon: <Cpu className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
      <Tabs options={tabs} value={tab} onChange={setTab} ariaLabel="Primary agent routing" />
      {tab === 'cli' ? (
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Session CLI</p>
            <p className="text-xs text-muted-foreground">
              The coding agent launched in a session terminal to run tasks.
            </p>
          </div>
          <Select
            options={CLI_OPTIONS}
            value={cli}
            onChange={onSetCli}
            aria-label="Session agent CLI"
            className="w-44 shrink-0"
          />
        </div>
      ) : (
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">AI provider</p>
            <p className="text-xs text-muted-foreground">
              Powers midnite&apos;s own AI (triage, plan drafting, heartbeat). Add each provider&apos;s
              key in its card below.
            </p>
          </div>
          {activeProvider ? (
            <Select
              options={PROVIDER_OPTIONS}
              value={activeProvider}
              onChange={onSetProvider}
              aria-label="Active AI provider"
              className="w-44 shrink-0"
            />
          ) : null}
        </div>
      )}
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
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    getKnowledgeSources()
      .then(setSources)
      .catch((e) => setError(errMsg(e)));
  }, []);

  const remove = async (id: string) => {
    const ok = await confirm({
      title: 'Remove this source?',
      description: 'It will no longer be shared with your projects.',
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    setSources(await removeKnowledgeSource(id));
  };

  const reorder = async (ids: string[]) => {
    const prev = sources;
    setSources(orderByIds(prev, ids)); // optimistic
    try {
      setSources(await reorderKnowledgeSources(ids));
    } catch (e) {
      setSources(prev); // roll back
      throw e;
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
          Links shared with every project, on top of its own sources — drag the grip to reorder. A
          project&apos;s own source for the same link takes precedence.
        </p>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <SourceListEditor
          sources={sources}
          max={MAX_GLOBAL_SOURCES}
          placeholder="Paste a GitHub, Notion, Google Docs or any link"
          onAdd={async (url) => setSources(await addKnowledgeSource(url))}
          onRemove={remove}
          onReorder={reorder}
        />
      </div>
    </Accordion>
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
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
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

      <Collapse open={open}>
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
      </Collapse>
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
      {/* min-height keeps every header the same height whether or not it has an
          action button (e.g. Sub Agents' Add), so the titles align down the page. */}
      <div className="flex min-h-[3.25rem] items-center gap-2 px-3 py-2.5">
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
      <Collapse open={open}>
        <div className="border-t border-border/60">{children}</div>
      </Collapse>
    </section>
  );
}
