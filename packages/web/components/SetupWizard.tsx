'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  X,
} from 'lucide-react';
import {
  AGENT_CLI_HOMEPAGE_URL,
  AGENT_CLI_LABEL,
  LLM_PROVIDER_LABEL,
  type LlmProvider,
  LlmProviderSchema,
  type ProvidersResponse,
  type SetupStatus,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import {
  AGENT_POOL_MAX,
  AGENT_POOL_MIN,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import {
  createRepo,
  getCliStatuses,
  getProviders,
  getSetupStatus,
  setActiveProvider,
  updateProvider,
} from '@/lib/api';
import { useLocalStorage } from '@/lib/use-local-storage';
import { SETUP_DOT, SETUP_ITEM_HREF } from '@/lib/setup-items';
import { cn } from '@/lib/utils';

const WIZARD_DISMISS_KEY = 'midnite.setup-wizard.dismissed';

// ── step definitions ──────────────────────────────────────────────────────────

const STEPS = ['provider', 'tools', 'pool', 'repo', 'finish'] as const;
type StepId = (typeof STEPS)[number];

const STEP_LABELS: Record<StepId, string> = {
  provider: 'AI provider',
  tools: 'System tools',
  pool: 'Concurrency',
  repo: 'Repository',
  finish: 'Ready!',
};

// ── step: Provider ─────────────────────────────────────────────────────────────

function ProviderStep({ onDone }: { onDone: () => void }) {
  const [providers, setProviders] = useState<ProvidersResponse | null>(null);
  const [selected, setSelected] = useState<LlmProvider>('anthropic');
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProviders().then((p) => {
      setProviders(p);
      if (p.activeProvider) setSelected(p.activeProvider);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (key.trim()) {
        await updateProvider(selected, { apiKey: key.trim() });
      }
      await setActiveProvider(selected);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const active = providers?.providers.find((p) => p.provider === selected);
  const hasKey = !!active?.hasKey;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">AI provider</h3>
        <p className="text-xs text-muted-foreground">
          midnite uses an LLM to classify tasks, plan, and guide agents. Paste your API key here
          — it's encrypted at rest.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="wizard-provider" className="text-xs font-medium">Provider</label>
          <select
            id="wizard-provider"
            value={selected}
            onChange={(e) => setSelected(LlmProviderSchema.parse(e.target.value))}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {providers?.providers.map((p) => (
              <option key={p.provider} value={p.provider}>{LLM_PROVIDER_LABEL[p.provider] ?? p.provider}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="wizard-key" className="text-xs font-medium">
            API key {hasKey ? <span className="text-muted-foreground">(already set — leave blank to keep)</span> : null}
          </label>
          <input
            id="wizard-key"
            type="password"
            autoComplete="off"
            placeholder={hasKey ? '••••••••' : 'sk-…'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || (!key.trim() && !hasKey)}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {hasKey && !key.trim() ? 'Keep existing key' : 'Save and continue'}
          {!saving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
        </Button>
      </div>
    </div>
  );
}

// ── step: Tools ────────────────────────────────────────────────────────────────

function ToolsStep({ onDone }: { onDone: () => void }) {
  const [statuses, setStatuses] = useState<Awaited<ReturnType<typeof getCliStatuses>> | null>(null);

  useEffect(() => {
    getCliStatuses().then(setStatuses).catch(() => {});
  }, []);

  const refresh = () => getCliStatuses().then(setStatuses).catch(() => {});

  // The two required CLIs for the core workflow.
  const REQUIRED = ['claude', 'gh'] as const;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">System tools</h3>
        <p className="text-xs text-muted-foreground">
          midnite runs <code className="font-mono text-[11px]">claude</code> to execute tasks and uses <code className="font-mono text-[11px]">gh</code> to open pull requests.
        </p>
      </div>

      <div className="space-y-2">
        {REQUIRED.map((id) => {
          const cliStatus = statuses?.find((s) => s.cli === id);
          const ok = cliStatus?.installed === true;
          const label = id === 'gh' ? 'gh (GitHub CLI)' : (AGENT_CLI_LABEL[id as keyof typeof AGENT_CLI_LABEL] ?? id);
          const href = id === 'gh' ? 'https://cli.github.com' : (AGENT_CLI_HOMEPAGE_URL[id as keyof typeof AGENT_CLI_HOMEPAGE_URL] ?? 'https://claude.ai/code');
          return (
            <div key={id} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: ok ? SETUP_DOT.ok : SETUP_DOT.missing }}
              />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {cliStatus?.version ? <span className="text-xs text-muted-foreground">{cliStatus.version}</span> : null}
              {!ok ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline-offset-2 hover:underline"
                >
                  Install →
                </a>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={refresh} className="text-xs text-muted-foreground hover:text-foreground">
          Re-check
        </button>
        <Button onClick={onDone}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── step: Pool ─────────────────────────────────────────────────────────────────

function PoolStep({ onDone }: { onDone: () => void }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const poolSize = Math.min(AGENT_POOL_MAX, Math.max(AGENT_POOL_MIN, settings.agentPoolSize));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Concurrency</h3>
        <p className="text-xs text-muted-foreground">
          How many tasks can run in parallel. Start low — you can always increase it in Settings.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={AGENT_POOL_MIN}
            max={AGENT_POOL_MAX}
            value={poolSize}
            onChange={(e) =>
              setSettings((s) => ({ ...s, agentPoolSize: Number(e.target.value) }))
            }
            className="flex-1 accent-primary"
          />
          <span className="w-8 text-center text-sm font-mono font-semibold tabular-nums">{poolSize}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {poolSize === 1 ? 'One task at a time (safe default).' : `Up to ${poolSize} tasks in parallel.`}
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onDone}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── step: Repo ─────────────────────────────────────────────────────────────────

function RepoStep({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!name.trim() || !path.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createRepo({ name: name.trim(), path: path.trim() });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add repo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">Repository <span className="font-normal text-muted-foreground">(optional)</span></h3>
        <p className="text-xs text-muted-foreground">
          Add the repository midnite will work in. You can add more later under Settings → Repos.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="wizard-repo-name" className="text-xs font-medium">Name</label>
          <input
            id="wizard-repo-name"
            placeholder="my-app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="wizard-repo-path" className="text-xs font-medium">Path</label>
          <input
            id="wizard-repo-path"
            placeholder="~/code/my-app"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">
          Skip — manage repos later
        </button>
        <Button onClick={save} disabled={saving || !name.trim() || !path.trim()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Add repo <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── step: Finish ───────────────────────────────────────────────────────────────

function FinishStep({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    getSetupStatus().then(setStatus).catch(() => {});
  }, []);

  const goToBoard = () => {
    onClose();
    router.push('/tasks');
  };

  return (
    <div className="space-y-4">
      {status?.ready ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">You&apos;re all set!</span>
        </div>
      ) : (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Almost there</h3>
          <p className="text-xs text-muted-foreground">A few items still need attention.</p>
        </div>
      )}

      {status ? (
        <ul className="space-y-1.5">
          {status.items.map((item) => {
            const done = item.state === 'ok';
            return (
              <li key={item.id} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: SETUP_DOT[item.state] }}
                />
                <span className={done ? 'text-muted-foreground' : 'font-medium'}>{item.label}</span>
                {item.detail ? <span className="text-muted-foreground/70">— {item.detail}</span> : null}
                {!done ? (
                  <a href={SETUP_ITEM_HREF[item.id]} className="ml-auto text-primary hover:underline">
                    Fix →
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={goToBoard}>
          {status?.ready ? 'Start building' : 'Go to board'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── wizard shell ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SetupWizard({ open, onClose }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const step = STEPS[stepIndex];

  const next = useCallback(() => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1)), []);
  const back = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  // Trap focus and close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof window === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Setup wizard"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
          <Rocket className="h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1 text-sm font-semibold">Set up midnite</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step breadcrumb */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border/40 px-5 py-2.5 scrollbar-none">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s} className="flex items-center gap-1.5 shrink-0">
                {i > 0 ? <div className={cn('h-px w-3', i <= stepIndex ? 'bg-primary/60' : 'bg-border')} /> : null}
                <button
                  type="button"
                  disabled={i > stepIndex}
                  onClick={() => i < stepIndex && setStepIndex(i)}
                  className={cn(
                    'flex items-center gap-1 text-[11px] font-medium transition-colors',
                    done ? 'text-primary cursor-pointer hover:text-primary/80' : '',
                    active ? 'text-foreground' : '',
                    !done && !active ? 'text-muted-foreground' : '',
                  )}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Circle className={cn('h-3 w-3', active ? 'text-primary fill-primary/20' : '')} />
                  )}
                  {STEP_LABELS[s]}
                </button>
              </div>
            );
          })}
        </div>

        {/* Step body */}
        <div className="p-5">
          {step === 'provider' ? (
            <ProviderStep onDone={next} />
          ) : step === 'tools' ? (
            <ToolsStep onDone={next} />
          ) : step === 'pool' ? (
            <PoolStep onDone={next} />
          ) : step === 'repo' ? (
            <RepoStep onDone={next} onSkip={next} />
          ) : (
            <FinishStep onClose={onClose} />
          )}
        </div>

        {/* Footer nav (back button) — only on non-terminal steps with a prior step */}
        {stepIndex > 0 && step !== 'finish' ? (
          <div className="border-t border-border/40 px-5 py-3">
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

// ── auto-open controller ───────────────────────────────────────────────────────

/**
 * Mounts in the main layout alongside SetupNudge. Auto-opens the wizard when:
 * - The install isn't ready (`!status.ready`), AND
 * - The wizard hasn't been dismissed in localStorage yet.
 *
 * The nudge's "Open setup wizard" CTA also opens it via the shared `onOpenWizard` ref.
 */
export function SetupWizardController({
  onOpenWizard,
}: {
  /** Ref callback: call `fn()` to open the wizard programmatically (used by SetupNudge). */
  onOpenWizard: (fn: () => void) => void;
}) {
  const [open, setOpen] = useState(false);

  const openWizard = useCallback(() => setOpen(true), []);
  const closeWizard = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(WIZARD_DISMISS_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  // Register the open callback with the parent so the nudge can trigger it.
  useEffect(() => {
    onOpenWizard(openWizard);
  }, [onOpenWizard, openWizard]);

  // Auto-open on first visit when !ready and not dismissed.
  useEffect(() => {
    try {
      if (localStorage.getItem(WIZARD_DISMISS_KEY) === 'true') return;
    } catch {
      // ignore
    }
    getSetupStatus()
      .then((s) => {
        if (!s.ready) setOpen(true);
      })
      .catch(() => {});
  }, []);

  return <SetupWizard open={open} onClose={closeWizard} />;
}
