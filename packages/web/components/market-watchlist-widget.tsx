'use client';

import { useState } from 'react';
import { Plus, Settings2, Star, Trash2, X } from 'lucide-react';
import {
  MARKET_WATCHLIST_MAX,
  type AssetKind,
  type MarketHistoryResponse,
  type MarketTimeframe,
} from '@midnite/shared';
import { getMarketHistory } from '@/lib/api';
import type { MarketAsset, MarketWatchlistConfig } from '@/lib/dashboard-widgets';
import { useGlobalTimeframe } from '@/lib/use-global-timeframe';
import { usePolling } from '@/lib/use-polling';
import { cn } from '@/lib/utils';
import { fmtPct, fmtPrice } from './market-asset-widget';
import { AssetSearchSelect } from './ui/asset-search-select';
import { DashboardTimeframe } from './dashboard-timeframe';
import { WidgetCard } from './widget-card';

const HISTORY_REFRESH_MS = 60_000;

type Props = {
  config: MarketWatchlistConfig;
  onConfigChange: (config: MarketWatchlistConfig) => void;
};

const assetKey = (a: MarketAsset) => `${a.kind}:${a.symbol}`;

export function MarketWatchlistWidget({ config, onConfigChange }: Props) {
  const [timeframe] = useGlobalTimeframe();
  const [editing, setEditing] = useState(false);
  const { title, assets } = config;

  return (
    <WidgetCard
      title={title || 'Watchlist'}
      icon={Star}
      actions={
        <>
          <DashboardTimeframe />
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-label={editing ? 'Done editing' : 'Edit watchlist'}
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
        <WatchlistEditor config={config} onConfigChange={onConfigChange} />
      ) : assets.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          No assets yet — open settings to add some.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {assets.map((a) => (
            <WatchRow key={assetKey(a)} asset={a} timeframe={timeframe} />
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

function WatchRow({ asset, timeframe }: { asset: MarketAsset; timeframe: MarketTimeframe }) {
  const { data: history } = usePolling<MarketHistoryResponse | null>(
    async () => getMarketHistory(asset.kind, asset.symbol, timeframe),
    HISTORY_REFRESH_MS,
    [asset.kind, asset.symbol, timeframe],
  );

  const points = history?.points ?? [];
  const last = points.at(-1)?.c;
  const first = points[0]?.c;
  const pct = first && last ? ((last - first) / first) * 100 : null;
  const up = (pct ?? 0) >= 0;

  return (
    <li className="flex items-baseline justify-between gap-2 py-1.5">
      <span className="min-w-0 flex-1 truncate text-sm">{asset.name}</span>
      {last == null ? (
        <span className="text-xs text-muted-foreground">…</span>
      ) : (
        <span className="flex items-baseline gap-2 tabular-nums">
          <span className="text-sm">{fmtPrice(last)}</span>
          <span
            className={cn(
              'w-16 text-right text-xs font-medium',
              up ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
            )}
          >
            {pct == null ? '—' : fmtPct(pct)}
          </span>
        </span>
      )}
    </li>
  );
}

function WatchlistEditor({ config, onConfigChange }: Props) {
  const { title, assets } = config;
  const [kind, setKind] = useState<AssetKind>('crypto');
  const atCap = assets.length >= MARKET_WATCHLIST_MAX;

  const addAsset = (a: MarketAsset) => {
    if (atCap || assets.some((x) => assetKey(x) === assetKey(a))) return;
    onConfigChange({ ...config, assets: [...assets, a] });
  };
  const removeAsset = (key: string) =>
    onConfigChange({ ...config, assets: assets.filter((x) => assetKey(x) !== key) });

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-muted-foreground">Card name</span>
        <input
          value={title}
          onChange={(e) => onConfigChange({ ...config, title: e.target.value })}
          placeholder="e.g. My coins"
          className="w-full rounded-md border border-border/60 bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </label>

      {assets.length > 0 && (
        <ul className="space-y-1">
          {assets.map((a) => (
            <li key={assetKey(a)} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-sm">{a.name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{a.kind}</span>
              <button
                type="button"
                onClick={() => removeAsset(assetKey(a))}
                aria-label={`Remove ${a.name}`}
                className="rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {atCap ? (
        <p className="text-[11px] text-muted-foreground">
          At the {MARKET_WATCHLIST_MAX}-asset limit — remove one to add another.
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center rounded-md border border-border/60 p-0.5 text-xs">
            {(['crypto', 'stock'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
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
          <div className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <AssetSearchSelect
                kind={kind}
                placeholder={kind === 'crypto' ? 'Add a coin…' : 'Add a stock…'}
                onSelect={(r) => addAsset({ kind: r.kind, symbol: r.symbol, name: r.name })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
