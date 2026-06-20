'use client';

import { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { LineChart as LineChartIcon, Pencil, X } from 'lucide-react';
import type { AssetKind, MarketHistoryResponse, MarketQuote } from '@midnite/shared';
import { getMarketHistory, getMarketQuote } from '@/lib/api';
import type { MarketAssetConfig } from '@/lib/dashboard-widgets';
import { useGlobalTimeframe } from '@/lib/use-global-timeframe';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { AssetSearchSelect } from './ui/asset-search-select';
import { DashboardTimeframe } from './dashboard-timeframe';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

const QUOTE_REFRESH_MS = 60_000;
const HISTORY_REFRESH_MS = 5 * 60_000;

// Vivid, theme-independent gain/loss colours (tailwind green-500 / red-500) so the
// chart line and gradient stay legible in both light and dark mode.
const UP_COLOR = '#22c55e';
const DOWN_COLOR = '#ef4444';

type Props = {
  config: MarketAssetConfig;
  onConfigChange: (config: MarketAssetConfig) => void;
};

/** Price with a sensible precision: more decimals for sub-dollar (crypto) amounts. */
export function fmtPrice(n: number, currency = 'USD'): string {
  const abs = Math.abs(n);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtPct(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function MarketAssetWidget({ config, onConfigChange }: Props) {
  const [timeframe] = useGlobalTimeframe();
  const [editing, setEditing] = useState(false);
  const configured = config.symbol !== '';
  const showPicker = !configured || editing;

  const { data: quote } = usePolling<MarketQuote | null>(
    async () => (configured ? getMarketQuote(config.kind, config.symbol) : null),
    QUOTE_REFRESH_MS,
    [config.kind, config.symbol],
  );
  const { data: history, error: historyError } = usePolling<MarketHistoryResponse | null>(
    async () => (configured ? getMarketHistory(config.kind, config.symbol, timeframe) : null),
    HISTORY_REFRESH_MS,
    [config.kind, config.symbol, timeframe],
  );

  return (
    <WidgetCard
      title={configured ? config.name : 'Stock / Crypto'}
      icon={LineChartIcon}
      actions={
        configured ? (
          <>
            <DashboardTimeframe />
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-label={editing ? 'Cancel' : 'Change asset'}
              aria-pressed={editing}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </button>
          </>
        ) : null
      }
      bodyClassName="flex flex-col"
    >
      {showPicker ? (
        <AssetPicker
          kind={config.kind}
          onKindChange={(kind) => onConfigChange({ kind, symbol: '', name: '' })}
          onSelect={(a) => {
            onConfigChange(a);
            setEditing(false);
          }}
        />
      ) : !quote ? (
        historyError ? (
          <p className="px-4 py-6 text-center text-sm text-destructive">Couldn’t load market data.</p>
        ) : (
          <WidgetLoader />
        )
      ) : (
        <AssetReadout quote={quote} history={history} timeframe={timeframe} />
      )}
    </WidgetCard>
  );
}

function AssetPicker({
  kind,
  onKindChange,
  onSelect,
}: {
  kind: AssetKind;
  onKindChange: (kind: AssetKind) => void;
  onSelect: (asset: MarketAssetConfig) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center rounded-md border border-border/60 p-0.5 text-xs">
        {(['crypto', 'stock'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindChange(k)}
            aria-pressed={kind === k}
            className={cn(
              'flex-1 rounded px-2 py-1 font-medium transition-colors',
              kind === k ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {k === 'crypto' ? 'Crypto' : 'Stocks'}
          </button>
        ))}
      </div>
      <AssetSearchSelect
        kind={kind}
        placeholder={kind === 'crypto' ? 'Search coins…' : 'Search stocks…'}
        onSelect={(r) => onSelect({ kind: r.kind, symbol: r.symbol, name: r.name })}
      />
      {kind === 'stock' && (
        <p className="text-[11px] leading-snug text-muted-foreground/70">
          Stocks need a free Twelve Data API key on the gateway.
        </p>
      )}
    </div>
  );
}

function AssetReadout({
  quote,
  history,
  timeframe,
}: {
  quote: MarketQuote;
  history: MarketHistoryResponse | null;
  timeframe: string;
}) {
  const up = quote.changePct >= 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tabular-nums leading-none">{fmtPrice(quote.price, quote.currency)}</span>
        <span
          className={cn(
            'text-sm font-medium tabular-nums',
            up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
          )}
        >
          {fmtPct(quote.changePct)}
        </span>
      </div>

      <PriceChart points={history?.points ?? []} up={up} currency={quote.currency} />

      <dl className="grid grid-cols-4 gap-x-2 text-center text-[11px]">
        {(
          [
            ['O', quote.open],
            ['H', quote.high],
            ['L', quote.low],
            ['C', quote.close],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{fmtPrice(value, quote.currency)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-center text-[10px] uppercase tracking-wide text-muted-foreground/60">{timeframe} chart</p>
    </div>
  );
}

function PriceChart({ points, up, currency }: { points: { t: number; c: number }[]; up: boolean; currency: string }) {
  if (points.length === 0) {
    return <div className="min-h-0 flex-1" aria-hidden />;
  }
  const color = up ? UP_COLOR : DOWN_COLOR;
  const gradientId = up ? 'market-area-up' : 'market-area-down';

  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Tooltip
            isAnimationActive={false}
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              padding: '4px 8px',
            }}
            labelFormatter={() => ''}
            formatter={(value: number | string) => [fmtPrice(Number(value), currency), '']}
          />
          {/* A bold stroke draws the line chart; the gradient fill sits beneath it. */}
          <Area
            type="monotone"
            dataKey="c"
            stroke={color}
            strokeWidth={2.25}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
