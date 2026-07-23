'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { type LucideIcon, Plus, ShieldAlert, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import type { ApprovalRule, AutonomyMode, CreateApprovalRule } from '@midnite/shared';
import { cn } from '@/lib/utils';
import {
  createApprovalRule,
  deleteApprovalRule,
  getAutonomyMode,
  listApprovalRules,
  setAutonomyMode,
  updateApprovalRule,
} from '@/lib/api';

// ---- Autonomy mode picker ----

type ModeCard = {
  mode: AutonomyMode;
  // Precise icon type: `React.ElementType` maps over `keyof JSX.IntrinsicElements`,
  // which @react-three/fiber (Phase 63) bloats to hundreds of three.js elements —
  // exploding the mapped type to `never`. `LucideIcon` is exact + immune.
  Icon: LucideIcon;
};

const MODE_CARDS: ModeCard[] = [
  { mode: 'manual', Icon: ShieldOff },
  { mode: 'guarded', Icon: ShieldAlert },
  { mode: 'autonomous', Icon: ShieldCheck },
];

function ModePicker({
  value,
  onChange,
}: {
  value: AutonomyMode;
  onChange: (m: AutonomyMode) => void;
}) {
  const t = useTranslations('settings');
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MODE_CARDS.map(({ mode, Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors',
            value === mode
              ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary'
              : 'hover:border-border/80 hover:bg-accent/40',
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5',
              value === mode ? 'text-primary' : 'text-muted-foreground',
            )}
          />
          <div>
            <p className="text-sm font-medium">{t(`security.modes.${mode}.label`)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t(`security.modes.${mode}.description`)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ---- Rule row ----

function RuleRow({
  rule,
  onToggle,
  onDelete,
}: {
  rule: ApprovalRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations('settings');
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-medium">{rule.toolName}</span>
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
              rule.effect === 'allow'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 text-destructive',
            )}
          >
            {rule.effect}
          </span>
          {!rule.enabled && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {t('security.disabled')}
            </span>
          )}
        </div>
        {rule.note && <p className="mt-0.5 text-xs text-muted-foreground">{rule.note}</p>}
        {rule.match?.commandPrefix && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('security.prefix', { values: rule.match.commandPrefix.join(', ') })}
          </p>
        )}
        {rule.match?.pathGlob && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('security.glob', { values: rule.match.pathGlob.join(', ') })}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          role="switch"
          aria-checked={rule.enabled}
          onClick={() => onToggle(rule.id, !rule.enabled)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            rule.enabled ? 'bg-primary' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              rule.enabled ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule.id)}
          aria-label={t('security.deleteRuleAriaLabel', { toolName: rule.toolName })}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---- Add rule form ----

function AddRuleForm({ onAdd }: { onAdd: (rule: CreateApprovalRule) => void; prefill?: Partial<CreateApprovalRule> }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [toolName, setToolName] = useState('');
  const [effect, setEffect] = useState<'allow' | 'deny'>('allow');
  const [note, setNote] = useState('');

  function submit(e: React.FormEvent): void {
    e.preventDefault();
    if (!toolName.trim()) return;
    onAdd({
      toolName: toolName.trim(),
      effect,
      enabled: true,
      scope: 'global',
      note: note.trim() || undefined,
    });
    setToolName('');
    setNote('');
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-medium">{t('security.newRule')}</p>
      <div className="flex flex-wrap gap-2">
        <input
          value={toolName}
          onChange={(e) => setToolName(e.target.value)}
          placeholder={t('security.toolNamePlaceholder')}
          className="flex-1 min-w-36 rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={effect}
          onChange={(e) => setEffect(e.target.value as 'allow' | 'deny')}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="allow">{t('security.allow')}</option>
          <option value="deny">{t('security.deny')}</option>
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('security.notePlaceholder')}
          className="flex-1 min-w-36 rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {tc('add')}
        </button>
      </div>
    </form>
  );
}

// ---- Main view ----

export function SecurityView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const searchParams = useSearchParams();
  const [mode, setModeState] = useState<AutonomyMode>('guarded');
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [modeRes, rules] = await Promise.all([getAutonomyMode(), listApprovalRules()]);
      setModeState(modeRes.mode);
      setRules(rules);
      setLoading(false);
    })();
  }, []);

  // Pre-fill from ?prefill= query param (set by ApprovalsDrawer "Make a rule").
  const [prefill, setPrefill] = useState<Partial<CreateApprovalRule> | undefined>();
  useEffect(() => {
    const raw = searchParams?.get('prefill');
    if (raw) {
      try {
        setPrefill(JSON.parse(decodeURIComponent(raw)) as Partial<CreateApprovalRule>);
      } catch {
        // ignore bad prefill
      }
    }
  }, [searchParams]);

  async function changeMode(m: AutonomyMode): Promise<void> {
    setModeState(m);
    await setAutonomyMode(m);
  }

  async function addRule(body: CreateApprovalRule): Promise<void> {
    const rule = await createApprovalRule(body);
    setRules((prev) => [...prev, rule]);
  }

  async function toggleRule(id: string, enabled: boolean): Promise<void> {
    const rule = await updateApprovalRule(id, { enabled });
    setRules((prev) => prev.map((r) => (r.id === id ? rule : r)));
  }

  async function removeRule(id: string): Promise<void> {
    await deleteApprovalRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{tc('loading')}</div>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-1 text-sm font-semibold">{t('security.autonomyMode')}</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {t('security.autonomyModeDescription')}
        </p>
        <ModePicker value={mode} onChange={(m) => { void changeMode(m); }} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">{t('security.approvalRules')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('security.approvalRulesDescription')}
            </p>
          </div>
          <a
            href="/ops"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {t('security.viewDecisionsLog')}
          </a>
        </div>

        {rules.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t('security.noRulesYet')}</p>
        ) : (
          <div className="space-y-2">
            {rules.map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                onToggle={(id, enabled) => { void toggleRule(id, enabled); }}
                onDelete={(id) => { void removeRule(id); }}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <AddRuleForm onAdd={(body) => { void addRule(body); }} prefill={prefill} />
        </div>
      </section>
    </div>
  );
}
