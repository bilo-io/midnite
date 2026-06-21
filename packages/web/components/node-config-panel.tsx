'use client';

import { useEffect, useState } from 'react';
import { Bot, Copy, Loader2, Trash2, X } from 'lucide-react';
import {
  getNodeTypeDefinition,
  LLM_PROVIDERS,
  LLM_PROVIDER_LABEL,
  type NodeField,
  type ScheduleTrigger,
  type Trigger,
  type TriggerType,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ModelComboSelect, StyledSelect } from '@/components/ui/styled-select';
import type { SelectOption } from '@/components/ui/select';
import { ProviderIcon } from '@/components/provider-icon';
import { rotateWorkflowWebhook } from '@/lib/api';
import { aiModelOptions, LLM_PROVIDER_ICON_KEY } from '@/lib/ai-node';
import { describeCron } from '@/lib/cron';
import { useWorkflowStore, type AppNode } from '@/lib/workflow-store';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const textareaClass =
  'flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function JsonField({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [text, setText] = useState(() =>
    value && typeof value === 'object' && Object.keys(value).length ? JSON.stringify(value, null, 2) : '',
  );
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="space-y-1">
      <textarea
        className={cn(textareaClass, 'font-mono text-xs', invalid && 'border-destructive')}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim()) {
            setInvalid(false);
            onChange({});
            return;
          }
          try {
            onChange(JSON.parse(next));
            setInvalid(false);
          } catch {
            setInvalid(true);
          }
        }}
        placeholder="{ }"
      />
      {invalid ? <p className="text-[11px] text-destructive">Invalid JSON</p> : null}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: NodeField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.kind) {
    case 'text':
      return (
        <textarea
          className={textareaClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case 'number':
      return (
        <input
          type="number"
          className={inputClass}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          placeholder={field.placeholder}
        />
      );
    case 'boolean':
      return <Switch checked={Boolean(value)} onCheckedChange={onChange} aria-label={field.label} />;
    case 'select':
      return (
        <select
          className={inputClass}
          value={typeof value === 'string' ? value : field.options?.[0]?.value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case 'json':
      return <JsonField value={value} onChange={onChange} />;
    default:
      return (
        <input
          className={inputClass}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }
}

/** A field value is in expression mode when it carries a `{{ }}` template. */
function isExpressionValue(value: unknown): boolean {
  return typeof value === 'string' && value.includes('{{');
}

/** Monospace input for a `{{ }}` expression. The data-picker/autocomplete that
 *  enriches this is the larger Theme-D follow-up; this is the literal entry. */
function ExpressionInput({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
}) {
  return (
    <input
      className={cn(inputClass, 'font-mono text-xs')}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? '{{ $json.field }}'}
      spellCheck={false}
      aria-label="Expression"
    />
  );
}

/** The ƒx affordance: flip an expressionable field between a literal control and
 *  the expression input. */
function FxToggle({ active, onToggle, fieldLabel }: { active: boolean; onToggle: () => void; fieldLabel: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Toggle expression mode for ${fieldLabel}`}
      title={active ? 'Use a literal value' : 'Use an expression'}
      className={cn(
        'rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold italic transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
      )}
    >
      fx
    </button>
  );
}

/** Editable node label in the config header. Commits on blur/Enter; the store
 *  may auto-suffix a clashing name, so we re-sync the draft from the prop. */
function NodeLabelInput({ id, label }: { id: string; label: string }) {
  const setLabel = useWorkflowStore((s) => s.setLabel);
  const [draft, setDraft] = useState(label);
  useEffect(() => setDraft(label), [label]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) setLabel(id, trimmed);
    else setDraft(label); // revert a blank/no-op edit to the canonical label
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      aria-label="Node label"
      className="-mx-1 w-full truncate rounded border border-transparent bg-transparent px-1 text-sm font-semibold hover:border-border focus-visible:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

// Provider options for the AI node, each branded with its icon. The empty value
// follows the gateway's active provider (chosen on the Agents page).
const AI_PROVIDER_OPTIONS: SelectOption<string>[] = [
  { value: '', label: 'Active provider', icon: <Bot className="h-3.5 w-3.5 text-muted-foreground" /> },
  ...LLM_PROVIDERS.map((p) => ({
    value: p,
    label: LLM_PROVIDER_LABEL[p],
    icon: <ProviderIcon provider={LLM_PROVIDER_ICON_KEY[p]} size={14} />,
  })),
];

function AiProviderField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <StyledSelect options={AI_PROVIDER_OPTIONS} value={value} onChange={onChange} aria-label="Provider" />
  );
}

function AiModelField({
  provider,
  value,
  onChange,
}: {
  provider: unknown;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ModelComboSelect
      options={aiModelOptions(provider)}
      value={value}
      onChange={onChange}
      placeholder="Select or type a model id"
      aria-label="Model"
    />
  );
}

function NodeFields({ node }: { node: AppNode }) {
  const updateNodeParams = useWorkflowStore((s) => s.updateNodeParams);
  const def = getNodeTypeDefinition(node.data.kind);
  // Per-field expression mode, seeded from whether the saved value is already a
  // `{{ }}` template. Mounted per node (keyed on node.id by the caller), so it
  // re-seeds when a different node is selected.
  const [fxMode, setFxMode] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of def?.fields ?? []) {
      if (f.expressionable) init[f.key] = isExpressionValue(node.data.params[f.key]);
    }
    return init;
  });

  if (!def) return null;
  if (def.fields.length === 0) {
    return <p className="text-xs text-muted-foreground">This node has no configuration.</p>;
  }

  const setParam = (key: string, val: unknown) => {
    const next = { ...node.data.params };
    if (val === undefined) delete next[key];
    else next[key] = val;
    updateNodeParams(node.id, next);
  };

  const isAi = node.data.kind === 'ai.claude';

  return (
    <div className="space-y-3">
      {def.fields.map((field) => {
        const value = node.data.params[field.key];
        const expressionable = field.expressionable === true;
        const inFx = expressionable && (fxMode[field.key] ?? false);
        let control: React.ReactNode;
        if (inFx) {
          control = (
            <ExpressionInput value={value} onChange={(v) => setParam(field.key, v)} placeholder={field.placeholder} />
          );
        } else if (isAi && field.key === 'provider') {
          control = (
            <AiProviderField
              value={typeof value === 'string' ? value : ''}
              onChange={(v) => setParam('provider', v)}
            />
          );
        } else if (isAi && field.key === 'model') {
          control = (
            <AiModelField
              provider={node.data.params.provider}
              value={typeof value === 'string' ? value : ''}
              onChange={(v) => setParam('model', v)}
            />
          );
        } else {
          control = <FieldInput field={field} value={value} onChange={(v) => setParam(field.key, v)} />;
        }
        return (
          <div key={field.key} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                {field.label}
                {field.required ? <span className="text-destructive"> *</span> : null}
              </label>
              {expressionable ? (
                <FxToggle
                  active={inFx}
                  fieldLabel={field.label}
                  onToggle={() => setFxMode((m) => ({ ...m, [field.key]: !(m[field.key] ?? false) }))}
                />
              ) : null}
            </div>
            {control}
            {inFx ? (
              <p className="text-[11px] text-muted-foreground">
                Expression — reference run data, e.g. <code className="font-mono">{'{{ $json.field }}'}</code>.
              </p>
            ) : field.help ? (
              <p className="text-[11px] text-muted-foreground">{field.help}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ScheduleFields({ trigger }: { trigger: ScheduleTrigger }) {
  const setTrigger = useWorkflowStore((s) => s.setTrigger);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Cron expression</label>
        <input
          className={cn(inputClass, 'font-mono')}
          value={trigger.cron}
          onChange={(e) => setTrigger({ ...trigger, cron: e.target.value })}
          placeholder="0 9 * * *"
        />
        <p className="text-[11px] text-muted-foreground">{describeCron(trigger.cron)}</p>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Timezone</label>
        <input
          className={inputClass}
          value={trigger.timezone}
          onChange={(e) => setTrigger({ ...trigger, timezone: e.target.value || 'UTC' })}
          placeholder="UTC"
        />
      </div>
    </div>
  );
}

function WebhookFields({ workflowId, hasSecret }: { workflowId: string; hasSecret: boolean }) {
  const [info, setInfo] = useState<{ url: string; token: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const rotate = async () => {
    setBusy(true);
    try {
      setInfo(await rotateWorkflowWebhook(workflowId));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!info) return;
    await navigator.clipboard.writeText(info.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Send a request to the workflow&rsquo;s URL to trigger a run. The URL embeds a secret token,
        shown once when generated.
      </p>
      {info ? (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
          <div className="flex items-center gap-1">
            <input className={cn(inputClass, 'font-mono text-[11px]')} value={info.url} readOnly />
            <Button type="button" variant="secondary" size="icon" onClick={() => void copy()} aria-label="Copy URL">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {copied ? <p className="text-[11px] text-muted-foreground">Copied.</p> : null}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {hasSecret ? 'A token already exists. Regenerate to reveal a fresh URL.' : 'No URL generated yet.'}
        </p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={() => void rotate()} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {hasSecret || info ? 'Regenerate URL' : 'Generate URL'}
      </Button>
    </div>
  );
}

function TriggerConfig({ workflowId }: { workflowId: string }) {
  const trigger = useWorkflowStore((s) => s.trigger);
  const setTrigger = useWorkflowStore((s) => s.setTrigger);
  const types: TriggerType[] = ['manual', 'schedule', 'webhook'];

  const choose = (type: TriggerType) => {
    if (type === trigger.type) return;
    const next: Trigger =
      type === 'schedule'
        ? { type: 'schedule', cron: '0 9 * * *', timezone: 'UTC' }
        : type === 'webhook'
          ? { type: 'webhook', method: 'POST', hasSecret: trigger.type === 'webhook' ? trigger.hasSecret : false }
          : { type: 'manual' };
    setTrigger(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => choose(t)}
            className={cn(
              'rounded-md border px-2 py-2 text-xs capitalize transition-colors',
              trigger.type === t ? 'border-foreground/30 bg-accent' : 'border-border/60 hover:bg-accent/40',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {trigger.type === 'schedule' ? <ScheduleFields trigger={trigger} /> : null}
      {trigger.type === 'webhook' ? (
        <WebhookFields workflowId={workflowId} hasSecret={trigger.hasSecret} />
      ) : null}
      {trigger.type === 'manual' ? (
        <p className="text-xs text-muted-foreground">
          Runs only when you press Run. The Run button works for any trigger type, so you can always
          test manually.
        </p>
      ) : null}
    </div>
  );
}

export function NodeConfigPanel({ workflowId }: { workflowId: string }) {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === selectedId) ?? null);
  const select = useWorkflowStore((s) => s.select);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const confirm = useConfirm();

  const deleteNode = async () => {
    if (!node) return;
    const ok = await confirm({
      title: 'Delete this node?',
      description: `“${node.data.label}” will be removed from the workflow.`,
      confirmLabel: 'Delete node',
    });
    if (ok) removeNode(node.id);
  };

  if (!node) {
    return (
      <aside className="flex w-80 shrink-0 items-center justify-center border-l border-border/60 bg-background/40 p-6 text-center text-xs text-muted-foreground">
        Select a node to configure it.
      </aside>
    );
  }

  const def = getNodeTypeDefinition(node.data.kind);
  const isTrigger = node.data.kind.startsWith('trigger.');

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border/60 bg-background/40">
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          {isTrigger ? (
            <h3 className="truncate text-sm font-semibold">{node.data.label}</h3>
          ) : (
            <NodeLabelInput id={node.id} label={node.data.label} />
          )}
          <p className="text-[11px] text-muted-foreground">{def?.title ?? node.data.kind}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={() => select(null)}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {isTrigger ? <TriggerConfig workflowId={workflowId} /> : <NodeFields key={node.id} node={node} />}
      </div>

      {!isTrigger ? (
        <footer className="border-t border-border/60 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void deleteNode()}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete node
          </Button>
        </footer>
      ) : null}
    </aside>
  );
}
