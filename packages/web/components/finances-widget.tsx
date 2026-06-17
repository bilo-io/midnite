'use client';

import { useState } from 'react';
import { List, Settings2, Sigma, Trash2, Wallet, X } from 'lucide-react';
import type { FinanceConfig, FinanceEntry } from '@/lib/dashboard-widgets';
import { cn } from '@/lib/utils';
import { WidgetCard } from './widget-card';

type FinancesWidgetProps = {
  config: FinanceConfig;
  onConfigChange: (config: FinanceConfig) => void;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const sum = (entries: FinanceEntry[]) => entries.reduce((t, e) => t + e.amount, 0);

export function FinancesWidget({ config, onConfigChange }: FinancesWidgetProps) {
  const [editing, setEditing] = useState(false);
  const { title, income, expenses, showDetail } = config;

  const incomeTotal = sum(income);
  const expenseTotal = sum(expenses);
  const leftover = incomeTotal - expenseTotal;

  const patch = (next: Partial<FinanceConfig>) => onConfigChange({ ...config, ...next });

  return (
    <WidgetCard
      title={title || 'Finances'}
      icon={Wallet}
      actions={
        <>
          <button
            type="button"
            onClick={() => patch({ showDetail: !showDetail })}
            aria-label={showDetail ? 'Show totals only' : 'Show line items'}
            aria-pressed={!showDetail}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {showDetail ? <Sigma className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? 'Done editing' : 'Edit finances'}
            aria-pressed={editing}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
          </button>
        </>
      }
      bodyClassName="overflow-auto p-3"
    >
      {editing ? (
        <FinancesEditor config={config} onConfigChange={onConfigChange} />
      ) : (
        <div className="flex flex-col gap-3">
          {showDetail ? (
            <>
              <EntryGroup label="Income" entries={income} total={incomeTotal} />
              <EntryGroup label="Expenses" entries={expenses} total={expenseTotal} />
            </>
          ) : (
            <div className="space-y-1.5 text-sm">
              <TotalRow label="Income" value={incomeTotal} />
              <TotalRow label="Expenses" value={expenseTotal} />
            </div>
          )}
          <LeftoverRow value={leftover} />
        </div>
      )}
    </WidgetCard>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{fmt(value)}</span>
    </div>
  );
}

function LeftoverRow({ value }: { value: number }) {
  return (
    <div className="flex items-baseline justify-between border-t border-border/40 pt-2">
      <span className="text-sm font-semibold">Leftover</span>
      <span
        className={cn(
          'text-base font-semibold tabular-nums',
          value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
        )}
      >
        {fmt(value)}
      </span>
    </div>
  );
}

function EntryGroup({ label, entries, total }: { label: string; entries: FinanceEntry[]; total: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{fmt(total)}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground/70">None yet.</p>
      ) : (
        <ul className="space-y-0.5 text-sm">
          {entries.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              <span className="tabular-nums">{fmt(e.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FinancesEditor({ config, onConfigChange }: FinancesWidgetProps) {
  const { title, income, expenses } = config;

  const setEntries = (key: 'income' | 'expenses', entries: FinanceEntry[]) =>
    onConfigChange({ ...config, [key]: entries });

  const addEntry = (key: 'income' | 'expenses', entry: FinanceEntry) =>
    setEntries(key, [...config[key], entry]);
  const updateEntry = (key: 'income' | 'expenses', id: string, patch: Partial<FinanceEntry>) =>
    setEntries(
      key,
      config[key].map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  const removeEntry = (key: 'income' | 'expenses', id: string) =>
    setEntries(
      key,
      config[key].filter((e) => e.id !== id),
    );

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Card name</span>
        <input
          value={title}
          onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
          placeholder="e.g. Fixed costs"
          className="w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      <EntryEditor
        label="Income"
        entries={income}
        onAdd={(e) => addEntry('income', e)}
        onUpdate={(id, patch) => updateEntry('income', id, patch)}
        onRemove={(id) => removeEntry('income', id)}
      />
      <EntryEditor
        label="Expenses"
        entries={expenses}
        onAdd={(e) => addEntry('expenses', e)}
        onUpdate={(id, patch) => updateEntry('expenses', id, patch)}
        onRemove={(id) => removeEntry('expenses', id)}
      />
    </div>
  );
}

function EntryEditor({
  label,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: {
  label: string;
  entries: FinanceEntry[];
  onAdd: (entry: FinanceEntry) => void;
  onUpdate: (id: string, patch: Partial<FinanceEntry>) => void;
  onRemove: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const amount = Number(newAmount);
  const valid = newLabel.trim() !== '' && newAmount.trim() !== '' && Number.isFinite(amount);

  const submit = () => {
    if (!valid) return;
    onAdd({ id: crypto.randomUUID(), label: newLabel.trim(), amount });
    setNewLabel('');
    setNewAmount('');
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {entries.length > 0 && (
        <ul className="space-y-1">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-1.5">
              <input
                value={e.label}
                onChange={(ev) => onUpdate(e.id, { label: ev.target.value })}
                aria-label={`${label} item name`}
                className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <input
                type="number"
                inputMode="decimal"
                value={e.amount}
                onChange={(ev) => onUpdate(e.id, { amount: Number(ev.target.value) })}
                aria-label={`${label} item amount`}
                className="w-24 rounded-md border border-border/60 bg-transparent px-2 py-1 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => onRemove(e.id)}
                aria-label={`Remove ${e.label}`}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label"
          className="min-w-0 flex-1 rounded-md border border-border/60 bg-transparent px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <input
          type="number"
          inputMode="decimal"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="0.00"
          className="w-24 rounded-md border border-border/60 bg-transparent px-2 py-1 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!valid}
          aria-label={`Add ${label.toLowerCase()} item`}
          className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
