'use client';

import { UpdateBannerView } from './update-banner-view';
import { useUpdate } from './update-provider';

/**
 * Container: wires the presentational banner (Phase 71 Theme C) to
 * update-available context. Mounted at the top of the root layout in a flex
 * column so it pushes the whole app down rather than overlaying it. Kept in a
 * separate module from the view so the view (and its stories) stay free of the
 * `@midnite/shared` import chain.
 */
export function UpdateBanner() {
  const { available, dismissed, belowFloor, latest, manifest, dismiss, applyUpdate } = useUpdate();
  const visible = available && (belowFloor || !dismissed);

  return (
    <UpdateBannerView
      visible={visible}
      belowFloor={belowFloor}
      latest={latest}
      notesUrl={manifest?.notesUrl}
      onUpdate={applyUpdate}
      onDismiss={dismiss}
    />
  );
}
