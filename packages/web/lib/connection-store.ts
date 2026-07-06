import { create } from 'zustand';

/**
 * Phase 56 E — live-connection status, per WS channel.
 *
 * `useReliableSubscription` reports each channel's transport state here; the
 * chrome indicator + cockpit panels read the **worst-of** across channels so a
 * single honest signal tells the user when live data may be behind.
 *
 * - `live` — socket open.
 * - `reconnecting` — socket down, backing off (short-lived, recoverable).
 * - `stale` — still down after several attempts; data is likely behind (the real
 *   `resync-required` signal arrives with Theme B; today it's a reconnect-count
 *   heuristic).
 */
export type ChannelStatus = 'live' | 'reconnecting' | 'stale';

type ConnectionState = {
  statuses: Record<string, ChannelStatus>;
  setChannelStatus: (channel: string, status: ChannelStatus) => void;
  clearChannel: (channel: string) => void;
};

export const useConnectionStore = create<ConnectionState>((set) => ({
  statuses: {},
  setChannelStatus: (channel, status) =>
    set((s) =>
      s.statuses[channel] === status ? s : { statuses: { ...s.statuses, [channel]: status } },
    ),
  clearChannel: (channel) =>
    set((s) => {
      if (!(channel in s.statuses)) return s;
      const next = { ...s.statuses };
      delete next[channel];
      return { statuses: next };
    }),
}));

/**
 * Worst-of across channels: `stale` (data behind) dominates `reconnecting`
 * (recovering) dominates `live`. No channels subscribed ⇒ `live` (nothing to be
 * behind on).
 */
export function worstStatus(statuses: Record<string, ChannelStatus>): ChannelStatus {
  const values = Object.values(statuses);
  if (values.includes('stale')) return 'stale';
  if (values.includes('reconnecting')) return 'reconnecting';
  return 'live';
}
