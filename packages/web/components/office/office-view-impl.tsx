'use client';

import { useOfficePresence } from '@/hooks/use-office-presence';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';
import { OfficeGame } from './office-game';
import { OfficeHud } from './office-hud';
import { PresenceHud } from './presence-hud';
import { PresenceNameDialog } from './presence-name-dialog';
import { useOfficeAgents } from './use-office-agents';

/**
 * The office stage: the Phaser canvas fills the panel and the React HUD overlays
 * it. `useOfficeAgents` keeps the desks in sync with live gateway sessions; both
 * the canvas and HUD are positioned against this `relative` box, so the
 * interaction panel stays scoped to the office rather than covering the whole app.
 *
 * Multiplayer presence (Phase 64): `useOfficePresence` connects the office to the
 * presence channel and registers its throttled move sender with the scene bridge,
 * so the Phaser scene publishes the player's position and renders remote teammates
 * (shared with the 3D view). With no peers connected the scene is exactly its solo
 * self. First-time guests are prompted for a display name.
 *
 * The canvas has a fixed aspect ratio, so the box is full width with its height
 * derived from `OFFICE_ASPECT` (canvas + overlay scale together, never distorted).
 */
export function OfficeViewImpl() {
  const { error } = useOfficeAgents();
  useGatewayErrorToast(error);
  const { dialog, emote, chat } = useOfficePresence();

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <OfficeGame />
      <OfficeHud />
      <PresenceHud emote={emote} chat={chat} />
      <PresenceNameDialog {...dialog} />
    </div>
  );
}
