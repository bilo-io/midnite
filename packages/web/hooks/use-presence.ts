'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  PRESENCE_WS_PATH,
  ServerPresenceMessageSchema,
  type PresenceFacing,
  type PresenceScene,
  type ServerPresenceMessage,
} from '@midnite/shared';
import { useOfficeStore } from '@/lib/office-store';
import { useConnectionStore } from '@/lib/connection-store';
import { loadGuestIdentity } from '@/lib/presence-identity';
import { shouldSendMove, type MoveSample } from '@/lib/presence-frames';
import { usePresenceStore } from '@/lib/presence-store';
import { useReliableSubscription, type ReliableChannel } from './use-reliable-subscription';

/** Move-sampler cadence: ~10Hz throttle, keepalive under the 15s server stale timeout. */
const MOVE_MIN_INTERVAL_MS = 100;
const MOVE_KEEPALIVE_MS = 7_000;

/**
 * Phase 64 Theme B — the presence client hook. Rides
 * [`use-reliable-subscription.ts`](./use-reliable-subscription.ts) as a snapshot
 * channel (no ring/resume — presence is last-known-state): it decodes server
 * frames into [`presence-store.ts`](../lib/presence-store.ts), sends the `hello`
 * on connect (+ again when the avatar/ghost changes), and exposes `sendMove`
 * (throttled ~10Hz + dedup'd, with an idle keepalive) and `sendEmote`. The caller
 * mounts it only while an office view is active, so presence stops on leave.
 *
 * The move source is the scene (Theme C wires the Phaser sampler); this hook owns
 * the transport, throttle, and identity.
 */
export function usePresence(
  enabled = true,
  /** Live display name; defaults to the persisted guest identity. Changing it
   *  re-sends the hello so a rename propagates without a reconnect. */
  displayName?: string,
): {
  sendMove: (x: number, y: number, facing: PresenceFacing, scene: PresenceScene) => void;
  sendEmote: (emoji: string) => void;
  sendChat: (text: string) => void;
} {
  const variant = useOfficeStore((s) => s.playerVariant);
  const tint = useOfficeStore((s) => s.playerTint);
  const ghost = usePresenceStore((s) => s.ghost);

  const fallbackName = useMemo(() => loadGuestIdentity().name, []);
  const name = displayName ?? fallbackName;
  const sendRef = useRef<((msg: unknown) => void) | null>(null);
  const lastMove = useRef<MoveSample | null>(null);
  const lastSentAt = useRef(0);

  const helloPayload = useCallback(
    () => ({ type: 'presence.hello' as const, name, variant, tint, ghost }),
    [name, variant, tint, ghost],
  );

  const channel = useMemo<ReliableChannel<ServerPresenceMessage>>(
    () => ({
      path: PRESENCE_WS_PATH,
      subscribe: () => null, // snapshot channel — no resume protocol
      decode: (raw) => {
        try {
          const parsed = ServerPresenceMessageSchema.safeParse(JSON.parse(raw));
          return parsed.success ? { event: parsed.data } : null;
        } catch {
          return null;
        }
      },
    }),
    [],
  );

  const { send } = useReliableSubscription<ServerPresenceMessage>(
    channel,
    {
      onEvent: (event) => usePresenceStore.getState().applyFrame(event, Date.now()),
      onOpen: (open) => {
        sendRef.current = open;
        lastMove.current = null; // force a fresh move after (re)connect
        lastSentAt.current = 0;
        open(helloPayload());
      },
    },
    enabled,
  );

  // Re-send hello when the avatar or ghost flag changes mid-session.
  useEffect(() => {
    if (sendRef.current) sendRef.current(helloPayload());
  }, [helloPayload]);

  // Mirror the transport status into the presence store; clear on unmount.
  const status = useConnectionStore((s) => s.statuses[PRESENCE_WS_PATH]);
  useEffect(() => {
    usePresenceStore.getState().setConnected(status === 'live');
  }, [status]);
  useEffect(() => () => usePresenceStore.getState().reset(), []);

  const sendMove = useCallback(
    (x: number, y: number, facing: PresenceFacing, scene: PresenceScene) => {
      const next: MoveSample = { x, y, facing, scene };
      const now = Date.now();
      if (!shouldSendMove(lastMove.current, next, lastSentAt.current, now, MOVE_MIN_INTERVAL_MS, MOVE_KEEPALIVE_MS)) {
        return;
      }
      lastMove.current = next;
      lastSentAt.current = now;
      send({ type: 'presence.move', ...next });
    },
    [send],
  );

  const sendEmote = useCallback((emoji: string) => send({ type: 'presence.emote', emoji }), [send]);
  const sendChat = useCallback((text: string) => send({ type: 'presence.chat', text }), [send]);

  return { sendMove, sendEmote, sendChat };
}
