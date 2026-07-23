'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ApprovalLogEntry, ApprovalRule, ApprovalSettings, AutonomyMode, CreateApprovalRule } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VirtualList } from '@/components/ui/virtual-list';
import {
  createApprovalRule,
  deleteApprovalRule,
  getApprovalSettings,
  listApprovalLog,
  listApprovalRules,
  setApprovalMode,
  updateApprovalRule,
} from '@/lib/api';
import { cn } from '@/lib/utils';

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

const MODE_VALUES: AutonomyMode[] = ['manual', 'guarded', 'autonomous'];

const SAFE_TOOLS = ['Read', 'Grep', 'Glob', 'LS'];

const RESOLUTION_CLASSNAMES: Record<string, string> = {
  'allow': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'allow-session': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'deny': 'bg-destructive/10 text-destructive',
  'auto-allow': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'auto-deny': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'timeout': 'bg-muted text-muted-foreground',
  'expired': 'bg-muted text-muted-foreground',
};

export function ApprovalsView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [settings, setSettings] = useState<ApprovalSettings | null>(null);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [log, setLog] = useState<ApprovalLogEntry[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeUpdating, setModeUpdating] = useState(false);

  // New rule form state
  const [showForm, setShowForm] = useState(false);
  const [toolName, setToolName] = useState('');
  const [effect, setEffect] = useState<'allow' | 'deny'>('allow');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);

  const LOG_LIMIT = 20;

  const loadLog = async (page: number) => {
    setLogLoading(true);
    try {
      const res = await listApprovalLog({ page, limit: LOG_LIMIT });
      setLog(res.entries);
      setLogTotal(res.total);
      setLogPage(page);
    } catch {
      // log errors are non-fatal; main page content already loaded
    } finally {
      setLogLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([getApprovalSettings(), listApprovalRules()])
      .then(([s, r]) => { setSettings(s); setRules(r); })
      .catch((e) => setError(errMsg(e, t('approvals.errorFallback'))))
      .finally(() => setLoading(false));
    void loadLog(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetMode = async (mode: AutonomyMode) => {
    setModeUpdating(true);
    try {
      const updated = await setApprovalMode(mode);
      setSettings(updated);
    } catch (e) {
      setError(errMsg(e, t('approvals.errorFallback')));
    } finally {
      setModeUpdating(false);
    }
  };

  const handleToggleRule = async (rule: ApprovalRule) => {
    try {
      const updated = await updateApprovalRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (e) {
      setError(errMsg(e, t('approvals.errorFallback')));
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteApprovalRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(errMsg(e, t('approvals.errorFallback')));
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) { setFormError(t('approvals.rules.form.toolNameRequired')); return; }
    setFormError(null);
    setFormSaving(true);
    try {
      const req: CreateApprovalRule = {
        enabled: true,
        effect,
        toolName: toolName.trim(),
        scope: 'global',
        note: note.trim() || undefined,
      };
      const created = await createApprovalRule(req);
      setRules((prev) => [...prev, created]);
      setToolName(''); setEffect('allow'); setNote(''); setShowForm(false);
    } catch (err) {
      setFormError(errMsg(err, t('approvals.errorFallback')));
    } finally {
      setFormSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">{tc('loading')}</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-8 max-w-lg">
      {/* Mode picker */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t('approvals.mode.title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('approvals.mode.description')}
          </p>
        </div>
        <div className="space-y-2" role="radiogroup" aria-label={t('approvals.mode.title')}>
          {MODE_VALUES.map((value) => {
            const active = settings?.mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={modeUpdating}
                onClick={() => void handleSetMode(value)}
                className={cn(
                  'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                  active
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(`approvals.mode.options.${value}.label`)}</span>
                  {active && <span className="text-xs text-primary font-medium">{t('approvals.mode.active')}</span>}
                </div>
                <p className="text-xs mt-0.5 opacity-80">{t(`approvals.mode.options.${value}.description`)}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Safe tools chip list — shown when guarded */}
      {settings?.mode === 'guarded' && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('approvals.safeTools.title')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {SAFE_TOOLS.map((t) => (
              <span
                key={t}
                className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="border-t border-border" />

      {/* Rules */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">{t('approvals.rules.title')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t.rich('approvals.rules.description', {
                em: (chunks) => <em>{chunks}</em>,
              })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            {t('approvals.rules.add')}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => void handleCreateRule(e)}
            className="rounded-lg border border-border p-4 space-y-3 bg-card"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('approvals.rules.form.toolName')}</label>
                <Input
                  placeholder={t('approvals.rules.form.toolNamePlaceholder')}
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">{t('approvals.rules.form.effect')}</label>
                <select
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as 'allow' | 'deny')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="allow">{t('approvals.rules.form.effectAllow')}</option>
                  <option value="deny">{t('approvals.rules.form.effectDeny')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('approvals.rules.form.note')}</label>
              <Input
                placeholder={t('approvals.rules.form.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={formSaving}>
                {formSaving ? tc('saving') : t('approvals.rules.form.submit')}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                {tc('cancel')}
              </Button>
            </div>
          </form>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('approvals.rules.empty')}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5',
                  !rule.enabled && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  aria-label={rule.enabled ? t('approvals.rules.disable') : t('approvals.rules.enable')}
                  onClick={() => void handleToggleRule(rule)}
                  className={cn(
                    'h-4 w-4 shrink-0 rounded border transition-colors',
                    rule.enabled
                      ? 'border-primary bg-primary'
                      : 'border-border bg-background',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold rounded px-1.5 py-0.5',
                        rule.effect === 'allow'
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                          : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {rule.effect.toUpperCase()}
                    </span>
                    <span className="font-mono text-sm">{rule.toolName}</span>
                  </div>
                  {rule.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{rule.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t('approvals.rules.delete')}
                  onClick={() => void handleDeleteRule(rule.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="border-t border-border" />

      {/* History */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t('approvals.history.title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('approvals.history.description')}
          </p>
        </div>

        {logLoading && log.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{tc('loading')}</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('approvals.history.empty')}
          </p>
        ) : (
          <>
            <VirtualList
              items={log}
              rowKey={(entry) => entry.id}
              estimateRow={52}
              className="max-h-[60vh] rounded-lg border border-border"
              renderRow={(entry) => {
                const resClassName = RESOLUTION_CLASSNAMES[entry.resolution] ?? 'bg-muted text-muted-foreground';
                const resLabel =
                  entry.resolution in RESOLUTION_CLASSNAMES
                    ? t(`approvals.history.resolution.${entry.resolution}`)
                    : entry.resolution;
                return (
                  <div className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold',
                        resClassName,
                      )}
                    >
                      {resLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-sm">{entry.toolName}</span>
                      {entry.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {entry.summary}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {new Date(entry.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                );
              }}
            />

            {logTotal > LOG_LIMIT && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t('approvals.history.range', {
                    from: (logPage - 1) * LOG_LIMIT + 1,
                    to: Math.min(logPage * LOG_LIMIT, logTotal),
                    total: logTotal,
                  })}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logPage <= 1 || logLoading}
                    onClick={() => void loadLog(logPage - 1)}
                    className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                  >
                    {t('approvals.history.prev')}
                  </button>
                  <button
                    type="button"
                    disabled={logPage * LOG_LIMIT >= logTotal || logLoading}
                    onClick={() => void loadLog(logPage + 1)}
                    className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                  >
                    {t('approvals.history.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
