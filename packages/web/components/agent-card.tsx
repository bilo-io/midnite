'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  AGENT_CLI_HOMEPAGE_URL,
  AGENT_CLI_LABEL,
  CLI_PROVIDER_MAP,
  LLM_PROVIDER_API_KEY_URL,
  LLM_PROVIDER_LABEL,
  LLM_PROVIDER_MODEL_SUGGESTIONS,
  providerSupportsBaseUrl,
  type AgentCli,
  type AgentCliStatus,
  type CliTerminalAction,
  type LlmProvider,
  type ProviderCredential,
  type UpdateProviderCredentialRequest,
} from '@midnite/shared';
import { AgentCliLogo } from '@/components/agent-cli-logo';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { Input } from '@/components/ui/input';
import { Tabs, type TabOption } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type AgentTab = 'cli' | 'api';

export function AgentCard({
  cli,
  status,
  statusBusy,
  isActiveCli,
  providerCred,
  isActiveProvider,
  onSetActiveCli,
  onInstallAction,
  onSaveProvider,
  onSetActiveProvider,
}: {
  cli: AgentCli;
  status: AgentCliStatus | undefined;
  statusBusy: boolean;
  isActiveCli: boolean;
  providerCred: ProviderCredential | undefined;
  isActiveProvider: boolean;
  onSetActiveCli: () => void;
  onInstallAction: (action: CliTerminalAction) => void;
  onSaveProvider: (body: UpdateProviderCredentialRequest) => Promise<void>;
  onSetActiveProvider: () => Promise<void>;
}) {
  const t = useTranslations('setup');
  const label = AGENT_CLI_LABEL[cli];
  const provider = CLI_PROVIDER_MAP[cli];
  const installed = status?.installed ?? false;

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AgentTab>('cli');

  const tabOptions: TabOption<AgentTab>[] = [
    { value: 'cli', label: t('agents.tabs.cli') },
    ...(provider ? [{ value: 'api' as const, label: t('agents.tabs.api') }] : []),
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 surface-glass">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={
            open ? t('agents.collapse', { label }) : t('agents.expand', { label })
          }
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} />
        </button>
        <AgentCliLogo cli={cli} className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">{label}</span>

        {/* Installed/version badge */}
        {statusBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : installed ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(142 71% 45%)' }} />
            {status?.version ? (
              <span className="truncate font-mono">{status.version}</span>
            ) : (
              t('agents.installed')
            )}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'hsl(0 72% 55%)' }} />
            {t('agents.notInstalled')}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isActiveCli ? <Badge>{t('agents.badgeSessions')}</Badge> : null}
          {isActiveProvider ? <Badge tone="ai">{t('agents.badgeAi')}</Badge> : null}
        </div>
      </div>

      <Collapse open={open}>
        <div className="space-y-4 border-t border-border/60 p-4">
          <Tabs
            options={tabOptions}
            value={tab}
            onChange={setTab}
            ariaLabel={t('agents.configurationAria', { label })}
          />

          {tab === 'cli' ? (
            <CliTab
              cli={cli}
              status={status}
              busy={statusBusy}
              isActiveCli={isActiveCli}
              onAction={onInstallAction}
              onSetActiveCli={onSetActiveCli}
            />
          ) : provider ? (
            <ApiTab
              provider={provider}
              providerLabel={LLM_PROVIDER_LABEL[provider]}
              supportsBaseUrl={providerSupportsBaseUrl(provider)}
              modelSuggestions={LLM_PROVIDER_MODEL_SUGGESTIONS[provider]}
              cred={providerCred}
              isActiveProvider={isActiveProvider}
              onSave={onSaveProvider}
              onSetActive={onSetActiveProvider}
            />
          ) : null}
        </div>
      </Collapse>
    </section>
  );
}

function CliTab({
  cli,
  status,
  busy,
  isActiveCli,
  onAction,
  onSetActiveCli,
}: {
  cli: AgentCli;
  status: AgentCliStatus | undefined;
  busy: boolean;
  isActiveCli: boolean;
  onAction: (action: CliTerminalAction) => void;
  onSetActiveCli: () => void;
}) {
  const t = useTranslations('setup');
  const label = AGENT_CLI_LABEL[cli];
  const installed = status?.installed ?? false;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('agents.cli.description', { label })}{' '}
        <a
          href={AGENT_CLI_HOMEPAGE_URL[cli]}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
        >
          {t('agents.cli.docsLink', { label })}
          <ExternalLink className="h-3 w-3" />
        </a>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              {t('agents.cli.uninstall')}
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
                {t('agents.cli.reinstall')}
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                {t('agents.cli.install')}
              </>
            )}
          </Button>
        </div>
        {isActiveCli ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            {t('agents.cli.activeForSessions')}
          </span>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={onSetActiveCli}>
            {t('agents.cli.useForSessions')}
          </Button>
        )}
      </div>
    </div>
  );
}

function ApiTab({
  provider,
  providerLabel,
  supportsBaseUrl,
  modelSuggestions,
  cred,
  isActiveProvider,
  onSave,
  onSetActive,
}: {
  provider: LlmProvider;
  providerLabel: string;
  supportsBaseUrl: boolean;
  modelSuggestions: string[];
  cred: ProviderCredential | undefined;
  isActiveProvider: boolean;
  onSave: (body: UpdateProviderCredentialRequest) => Promise<void>;
  onSetActive: () => Promise<void>;
}) {
  const t = useTranslations('setup');
  const modelsListId = `models-${provider}`;
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(cred?.baseUrl ?? '');
  const [planModel, setPlanModel] = useState(cred?.planModel ?? '');
  const [actModel, setActModel] = useState(cred?.actModel ?? '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed the non-secret fields when the stored credential changes (e.g. after
  // a save refresh). The key field stays blank — the raw key is never returned.
  useEffect(() => {
    setBaseUrl(cred?.baseUrl ?? '');
    setPlanModel(cred?.planModel ?? '');
    setActModel(cred?.actModel ?? '');
  }, [cred?.baseUrl, cred?.planModel, cred?.actModel]);

  const flash = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const save = async (override?: UpdateProviderCredentialRequest) => {
    setBusy(true);
    setError(null);
    try {
      const body: UpdateProviderCredentialRequest = override ?? {
        // Only send the key when the user typed one — a blank field leaves it unchanged.
        ...(apiKey ? { apiKey } : {}),
        ...(supportsBaseUrl ? { baseUrl } : {}),
        planModel,
        actModel,
      };
      await onSave(body);
      setApiKey('');
      flash();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agents.api.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const setActive = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSetActive();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agents.api.activateFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t('agents.api.description', { label: providerLabel })}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            {t('agents.api.apiKeyLabel')}
          </label>
          <a
            href={LLM_PROVIDER_API_KEY_URL[provider]}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('agents.api.getKey', { label: providerLabel })}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <Input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            cred?.hasKey
              ? t('agents.api.storedKeyPlaceholder', {
                  hint: cred.keyHint ?? t('agents.api.storedFallback'),
                })
              : t('agents.api.keyPlaceholder')
          }
          autoComplete="off"
          className="font-mono text-xs"
        />
      </div>

      {supportsBaseUrl ? (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('agents.api.baseUrlLabel')}
          </label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:11434/v1"
            className="font-mono text-xs"
          />
        </div>
      ) : null}

      <datalist id={modelsListId}>
        {modelSuggestions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('agents.api.planModelLabel')}
          </label>
          <Input
            list={modelsListId}
            value={planModel}
            onChange={(e) => setPlanModel(e.target.value)}
            placeholder={t('agents.api.modelPlaceholder')}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {t('agents.api.actModelLabel')}
          </label>
          <Input
            list={modelsListId}
            value={actModel}
            onChange={(e) => setActModel(e.target.value)}
            placeholder={t('agents.api.modelPlaceholder')}
            className="font-mono text-xs"
          />
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t('agents.api.save')}
          </Button>
          {cred?.hasKey ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void save({ apiKey: '' })}
              disabled={busy}
              className="text-muted-foreground hover:text-destructive"
            >
              {t('agents.api.clearKey')}
            </Button>
          ) : null}
          {saved ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5" />
              {t('agents.api.saved')}
            </span>
          ) : null}
        </div>
        {isActiveProvider ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            {t('agents.api.activeForAi')}
          </span>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => void setActive()} disabled={busy}>
            {t('agents.api.useForAi')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'ai' }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        tone === 'ai'
          ? 'bg-primary/15 text-primary'
          : 'bg-muted/70 text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}
