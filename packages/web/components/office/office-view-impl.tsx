'use client';

import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { OfficeGame } from './office-game';
import { OfficeHud } from './office-hud';
import { useOfficeAgents } from './use-office-agents';

/**
 * The office stage: the Phaser canvas fills the panel and the React HUD overlays
 * it. `useOfficeAgents` keeps the desks in sync with live gateway sessions; both
 * the canvas and HUD are positioned against this `relative` box, so the
 * interaction panel stays scoped to the office rather than covering the whole app.
 */
export function OfficeViewImpl() {
  const { error } = useOfficeAgents();
  useGatewayErrorToast(error);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ height: 'min(70vh, 560px)' }}
    >
      <OfficeGame />
      <OfficeHud />
    </div>
  );
}
