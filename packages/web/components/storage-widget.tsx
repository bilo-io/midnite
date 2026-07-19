'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { RadialGauge } from '@midnite/ui';
import { cn } from '@/lib/utils';
import { WidgetLoader } from './spinner';
import { WidgetCard } from './widget-card';

type Estimate = { usage: number; quota: number };
// `null` while the first estimate resolves; the string states are terminal.
type State = Estimate | 'unsupported' | 'error' | null;

/**
 * How much storage *this web app* has cached in the browser (IndexedDB /
 * CacheStorage), from the Storage Manager estimate — the origin's quota, which
 * browsers loosely derive from free disk space. This is app-level cache usage,
 * **not** the device's disk capacity; the Disk widget (gateway `fs.statfs`) shows
 * real hard-drive space. Titled "App cache" to keep the two distinct.
 */
export function StorageWidget() {
  const [state, setState] = useState<State>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      setState('unsupported');
      return;
    }
    setLoading(true);
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      setState({ usage, quota });
    } catch {
      setState('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <WidgetCard
      title="App cache"
      icon={Database}
      actions={
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Refresh cache estimate"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      }
      bodyClassName="flex flex-col items-center justify-center gap-3 p-4"
    >
      {state === null ? (
        <WidgetLoader />
      ) : state === 'unsupported' ? (
        <p className="px-2 text-center text-sm text-muted-foreground">
          Cache estimates aren’t available in this browser.
        </p>
      ) : state === 'error' ? (
        <p className="px-2 text-center text-sm text-destructive">Couldn’t read cache usage.</p>
      ) : (
        <RadialGauge usedBytes={state.usage} totalBytes={state.quota} />
      )}
    </WidgetCard>
  );
}
