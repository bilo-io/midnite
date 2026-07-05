'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

const MODE_OPTIONS: { value: AutonomyMode; label: string; description: string }[] = [
  {
    value: 'manual',
    label: 'Manual',
    description: 'Ask before every tool call. No automatic decisions.',
  },
  {
    value: 'guarded',
    label: 'Guarded',
    description: 'Auto-allow read-only tools (Read, Grep, Glob, LS). Ask for everything else.',
  },
  {
    value: 'autonomous',
    label: 'Autonomous',
    description: 'Rules decide. Escalate only when no rule matches.',
  },
];

const SAFE_TOOLS = ['Read', 'Grep', 'Glob', 'LS'];

const RESOLUTION_LABELS: Record<string, { label: string; className: string }> = {
  'allow': { label: 'Allow', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  'allow-session': { label: 'Allow (session)', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  'deny': { label: 'Deny', className: 'bg-destructive/10 text-destructive' },
  'auto-allow': { label: 'Auto-allow', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  'auto-deny': { label: 'Auto-deny', className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  'timeout': { label: 'Timeout', className: 'bg-muted text-muted-foreground' },
  'expired': { label: 'Expired', className: 'bg-muted text-muted-foreground' },
};

export function ApprovalsView() {
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
      .catch((e) => setError(errMsg(e)))
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
      setError(errMsg(e));
    } finally {
      setModeUpdating(false);
    }
  };

  const handleToggleRule = async (rule: ApprovalRule) => {
    try {
      const updated = await updateApprovalRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteApprovalRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) { setFormError('Tool name is required'); return; }
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
      setFormError(errMsg(err));
    } finally {
      setFormSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-8 max-w-lg">
      {/* Mode picker */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Autonomy mode</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Controls how midnite handles tool-use approvals during agent sessions.
          </p>
        </div>
        <div className="space-y-2" role="radiogroup" aria-label="Autonomy mode">
          {MODE_OPTIONS.map((opt) => {
            const active = settings?.mode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={modeUpdating}
                onClick={() => void handleSetMode(opt.value)}
                className={cn(
                  'w-full text-left rounded-lg border px-4 py-3 transition-colors',
                  active
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{opt.label}</span>
                  {active && <span className="text-xs text-primary font-medium">Active</span>}
                </div>
                <p className="text-xs mt-0.5 opacity-80">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Safe tools chip list — shown when guarded */}
      {settings?.mode === 'guarded' && (
        <section className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Always auto-allowed in guarded mode
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
            <h2 className="text-sm font-medium">Rules</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Durable allow/deny rules evaluated in <em>guarded</em> and <em>autonomous</em> modes.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5" />
            Add rule
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={(e) => void handleCreateRule(e)}
            className="rounded-lg border border-border p-4 space-y-3 bg-card"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tool name</label>
                <Input
                  placeholder="e.g. Bash, Read, * (all)"
                  value={toolName}
                  onChange={(e) => setToolName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Effect</label>
                <select
                  value={effect}
                  onChange={(e) => setEffect(e.target.value as 'allow' | 'deny')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Note (optional)</label>
              <Input
                placeholder="Why this rule exists"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={formSaving}>
                {formSaving ? 'Saving…' : 'Save rule'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No rules yet. Add one above to start customising tool behaviour.
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
                  aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
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
                  aria-label="Delete rule"
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
          <h2 className="text-sm font-medium">History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every tool-use decision — by you or the policy engine.
          </p>
        </div>

        {logLoading && log.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
        ) : log.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No decisions recorded yet.
          </p>
        ) : (
          <>
            <VirtualList
              items={log}
              rowKey={(entry) => entry.id}
              estimateRow={52}
              className="max-h-[60vh] rounded-lg border border-border"
              renderRow={(entry) => {
                const res = RESOLUTION_LABELS[entry.resolution] ?? {
                  label: entry.resolution,
                  className: 'bg-muted text-muted-foreground',
                };
                return (
                  <div className="flex items-start gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold',
                        res.className,
                      )}
                    >
                      {res.label}
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
                  {(logPage - 1) * LOG_LIMIT + 1}–
                  {Math.min(logPage * LOG_LIMIT, logTotal)} of {logTotal}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logPage <= 1 || logLoading}
                    onClick={() => void loadLog(logPage - 1)}
                    className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    disabled={logPage * LOG_LIMIT >= logTotal || logLoading}
                    onClick={() => void loadLog(logPage + 1)}
                    className="rounded px-2 py-1 hover:bg-accent disabled:opacity-40"
                  >
                    Next →
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
