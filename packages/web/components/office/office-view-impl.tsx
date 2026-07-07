'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePresence } from '@/hooks/use-presence';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';
import { setPresenceSampler } from '@/lib/presence-bridge';
import { loadGuestIdentity, saveGuestName } from '@/lib/presence-identity';
import { OfficeGame } from './office-game';
import { OfficeHud } from './office-hud';
import { PresenceNameDialog } from './presence-name-dialog';
import { useOfficeAgents } from './use-office-agents';

/**
 * The office stage: the Phaser canvas fills the panel and the React HUD overlays
 * it. `useOfficeAgents` keeps the desks in sync with live gateway sessions; both
 * the canvas and HUD are positioned against this `relative` box, so the
 * interaction panel stays scoped to the office rather than covering the whole app.
 *
 * Multiplayer presence (Phase 64 C): `usePresence` connects the office to the
 * presence channel and registers its throttled move sender with the scene bridge
 * (`setPresenceSampler`), so the Phaser scene publishes the player's position and
 * renders remote teammates. With no peers connected the scene is exactly its solo
 * self. First-time guests are prompted for a display name.
 *
 * The canvas has a fixed aspect ratio, so the box is full width with its height
 * derived from `OFFICE_ASPECT` (canvas + overlay scale together, never distorted).
 */
export function OfficeViewImpl() {
  const { error } = useOfficeAgents();
  useGatewayErrorToast(error);

  const [identity] = useState(() => loadGuestIdentity());
  const [name, setName] = useState(identity.name);
  const [nameDialogOpen, setNameDialogOpen] = useState(identity.isDefault);

  const { sendMove } = usePresence(true, name);
  useEffect(() => {
    setPresenceSampler(sendMove);
    return () => setPresenceSampler(null);
  }, [sendMove]);

  const submitName = useCallback((chosen: string) => {
    setName(saveGuestName(chosen) || chosen);
    setNameDialogOpen(false);
  }, []);
  const skipName = useCallback(() => {
    saveGuestName(identity.name); // persist the default so we don't re-prompt
    setNameDialogOpen(false);
  }, [identity.name]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <OfficeGame />
      <OfficeHud />
      <PresenceNameDialog open={nameDialogOpen} defaultName={identity.name} onSubmit={submitName} onSkip={skipName} />
    </div>
  );
}
