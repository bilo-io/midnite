'use client';

import { useState } from 'react';
import { Radio } from 'lucide-react';
import { WS_RING_SIZES, type WsRingSize } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { getWsSettings, updateWsSettings } from '@/lib/api';
import { useApiData } from '@/lib/use-api-data';

const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Phase 56 A — the realtime event-ring size. Larger buffers let a briefly
 * disconnected client resume more history before a full resync is forced
 * (Theme B). Reading is open; changing it is an admin action applied live
 * (in-memory — resets to the midnite.json default on gateway restart).
 */
export function RealtimeAccordion() {
  const { data: ringSize, refresh } = useApiData(getWsSettings, []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (value: WsRingSize) => {
    setSaving(true);
    setError(null);
    try {
      await updateWsSettings(value);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update — admin only');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Accordion title="Realtime" icon={<Radio className="h-3.5 w-3.5" />}>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">Event buffer size</p>
            <p className="text-xs text-muted-foreground">
              How many recent live events the gateway retains per channel so a briefly disconnected
              client can catch up instead of missing updates. Larger = longer catch-up window, more
              memory. Applied live (admin only); resets to the configured default on restart.
            </p>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <select
            aria-label="Event buffer size"
            className={inputClass}
            value={ringSize ?? ''}
            disabled={saving || ringSize === null}
            onChange={(e) => void onChange(Number(e.target.value) as WsRingSize)}
          >
            {ringSize === null ? <option value="">…</option> : null}
            {WS_RING_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} events
              </option>
            ))}
          </select>
        </div>
      </div>
    </Accordion>
  );
}
