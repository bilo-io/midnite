import type { PanelPlacement } from './panel-sections';

export type Rect = { x: number; y: number; width: number; height: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Viewport-relative target rect (in px) for the fixed preview panel, given a
 * placement and the current viewport size. Pure so it can be unit-tested without a
 * DOM. Tuned for desktop (≥ md); the panel is hidden on mobile.
 *
 * - `hero` — small, grid-card-sized, centred and sitting in the lower-middle so it
 *   reads below the headline.
 * - `right` / `left` — larger, vertically centred, offset to one side.
 * - `hidden` — reuses the `right` rect (it animates to opacity 0, so position is
 *   moot) to avoid a jump if it ever becomes visible again.
 */
export function panelRectFor(placement: PanelPlacement, vw: number, vh: number): Rect {
  if (placement === 'hero') {
    const width = clamp(vw * 0.34, 300, 420);
    const height = clamp(width * 0.66, 200, 300);
    // Sit low so the panel reads below the headline + CTAs (which now rise with
    // the tightened hero spacing) instead of crowding them.
    return { x: (vw - width) / 2, y: clamp(vh * 0.62, 360, vh - height - 24), width, height };
  }

  const width = clamp(vw * 0.42, 360, 580);
  const height = clamp(vh * 0.56, 300, 460);
  const y = (vh - height) / 2 + 24;
  const margin = clamp(vw * 0.06, 24, 140);
  const x = placement === 'left' ? margin : vw - width - margin;
  return { x, y, width, height };
}
