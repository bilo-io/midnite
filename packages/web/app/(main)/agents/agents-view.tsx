'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import type {
  AgentsConfig,
  PrimaryAgent,
  SubAgent,
  UpdatePrimaryAgentRequest,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createSubAgent,
  deleteSubAgent,
  getAgentsConfig,
  updatePrimaryAgent,
  updateSubAgent,
} from '@/lib/api';
import { formatHeartbeatInterval } from '@/lib/app-settings';
import { cn } from '@/lib/utils';

const SAVE_DEBOUNCE_MS = 600;

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function AgentsView() {
  const [agents, setAgents] = useState<AgentsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

  const { primary, subAgents } = agents;

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
  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {subAgent.name.trim() || `Subagent ${index + 1}`}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label="Remove subagent"
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`sub-name-${subAgent.id}`}>
          <Input
            id={`sub-name-${subAgent.id}`}
            value={subAgent.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Summariser"
          />
        </Field>
        <Field label="Role" htmlFor={`sub-role-${subAgent.id}`}>
          <Input
            id={`sub-role-${subAgent.id}`}
            value={subAgent.role}
            onChange={(e) => onChange({ role: e.target.value })}
            placeholder="Condenses long threads into a brief"
          />
        </Field>
      </div>

      <MarkdownField
        label="Description"
        hint="The full system prompt for this subagent."
        value={subAgent.description}
        onChange={(v) => onChange({ description: v })}
        placeholder="You are a summariser. Given a transcript, produce a tight, faithful summary…"
      />
    </div>
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
