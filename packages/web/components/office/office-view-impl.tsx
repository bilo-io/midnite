'use client';

import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { OFFICE_ASPECT } from '@/lib/office/dimensions';
import { OfficeGame } from './office-game';
import { OfficeHud } from './office-hud';
import { useOfficeAgents } from './use-office-agents';

/**
 * The office stage: the Phaser canvas fills the panel and the React HUD overlays
 * it. `useOfficeAgents` keeps the desks in sync with live gateway sessions; both
 * the canvas and HUD are positioned against this `relative` box, so the
 * interaction panel stays scoped to the office rather than covering the whole app.
 *
 * The canvas has a fixed aspect ratio, so the box is full width with its height
 * derived from `OFFICE_ASPECT` (canvas + overlay scale together, never distorted).
 * If that height overflows the viewport the page just scrolls — the header bar
 * collapses on scroll like everywhere else, so no special handling is needed here.
 */
export function OfficeViewImpl() {
  const { error } = useOfficeAgents();
  useGatewayErrorToast(error);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card"
      style={{ aspectRatio: OFFICE_ASPECT }}
    >
      <OfficeGame />
      <OfficeHud />
    </div>
  );
}
