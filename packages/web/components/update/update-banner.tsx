'use client';

import { UpdateBannerView } from './update-banner-view';
import { useUpdate } from './update-provider';

/**
 * Container: wires the presentational banner (Phase 71 Theme C) to
 * update-available context. Mounted at the top of the root layout in a flex
 * column so it pushes the whole app down rather than overlaying it. Kept in a
 * separate module from the view so the view (and its stories) stay free of the
 * `@midnite/shared` import chain.
 *
 * On desktop (Theme E) the electron-updater phase drives the headline, action
 * label, disabled state, and download progress; in a plain browser these fall back
 * to the default "Update → force-refresh" copy.
 */
export function UpdateBanner() {
  const {
    available,
    dismissed,
    belowFloor,
    latest,
    manifest,
    desktopPhase,
    downloadPercent,
    dismiss,
    applyUpdate,
  } = useUpdate();
  const visible = available && (belowFloor || !dismissed);

  // Map the desktop electron-updater phase to the banner's copy/action. In a plain
  // browser desktopPhase is null → the view's defaults ("Update").
  let headline: string | undefined;
  let actionLabel: string | undefined;
  let actionDisabled = false;
  switch (desktopPhase) {
    case 'downloading':
      headline = 'Downloading update…';
      actionLabel = downloadPercent !== null ? `Downloading ${downloadPercent}%` : 'Downloading…';
      actionDisabled = true;
      break;
    case 'downloaded':
      headline = 'An update is ready to install';
      actionLabel = 'Restart to install';
      break;
    case 'error':
      headline = 'Update failed';
      actionLabel = 'Retry';
      break;
    default:
      break;
  }

  return (
    <UpdateBannerView
      visible={visible}
      belowFloor={belowFloor}
      latest={latest}
      notesUrl={manifest?.notesUrl}
      headline={headline}
      actionLabel={actionLabel}
      actionDisabled={actionDisabled}
      downloadPercent={downloadPercent}
      onUpdate={applyUpdate}
      onDismiss={dismiss}
    />
  );
}
