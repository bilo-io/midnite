'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpCircle, RefreshCw, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { ReleaseNotesPopover } from './release-notes-popover';

export type UpdateBannerViewProps = {
  /** Render the banner open (animates in) vs collapsed (animates out). */
  visible: boolean;
  /** Below the force-update floor: the banner can't be dismissed (no ×). */
  belowFloor: boolean;
  /** Latest version string, shown as `v…`. */
  latest: string | null;
  /** Optional release-notes URL — turns the version into a link. */
  notesUrl?: string;
  /** Override the default headline (desktop states: downloading / ready / failed). */
  headline?: string;
  /** Action button label (defaults to "Update"; e.g. "Restart to install", "Retry"). */
  actionLabel?: string;
  /** Disable the action (e.g. mid-download). */
  actionDisabled?: boolean;
  /** Desktop download progress 0–100 — renders a progress bar when set. */
  downloadPercent?: number | null;
  onUpdate: () => void;
  onDismiss: () => void;
};

/**
 * Presentational "App update available" banner (Phase 71 Theme C + E). The surface is
 * the animated primary/brand gradient (`.update-banner-surface`) with white foreground
 * for contrast, animates in/out with an
 * ease-in-out height transition (grid-rows 0fr↔1fr, reduced-motion aware), and
 * publishes its measured height as `--update-banner-h` so the fixed nav can offset
 * its `top` and nothing is occluded. Stateless — the container wires it to context
 * and, on desktop, feeds the electron-updater phase in via headline/label/percent.
 */
export function UpdateBannerView({
  visible,
  belowFloor,
  latest,
  notesUrl,
  headline,
  actionLabel = 'Update',
  actionDisabled = false,
  downloadPercent = null,
  onUpdate,
  onDismiss,
}: UpdateBannerViewProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // Once collapsed, genuinely remove the content from the layout/paint (not just
  // clip it): a 0fr grid track still leaves the clipped children with a non-zero
  // box, so they'd read as "visible" to a11y tooling and tests. Keep them present
  // for the ease-out, then hide after the transition (timer, so reduced-motion —
  // which has no transitionend — still hides).
  const [collapsed, setCollapsed] = useState(!visible);
  useEffect(() => {
    if (visible) {
      setCollapsed(false);
      return undefined;
    }
    const t = setTimeout(() => setCollapsed(true), 320);
    return () => clearTimeout(t);
  }, [visible]);

  // Track rendered height so the fixed rail can offset by it exactly.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible, latest, belowFloor, downloadPercent]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--update-banner-h', visible ? `${height}px` : '0px');
    return () => {
      root.style.setProperty('--update-banner-h', '0px');
    };
  }, [visible, height]);

  const versionLabel = latest ? `v${latest}` : 'the latest version';
  const defaultHeadline = belowFloor
    ? 'Update required to keep using midnite'
    : 'A new version is available';
  const showProgress = downloadPercent !== null;

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out',
        'motion-reduce:transition-none',
      )}
      style={{ gridTemplateRows: visible ? '1fr' : '0fr' }}
    >
      {/* `inert` while collapsed: the buttons stay in the DOM for the height
          animation but must not be focusable or hit by a11y checks. `hidden`
          once fully collapsed removes it from layout entirely. */}
      <div
        className="min-h-0 overflow-hidden"
        inert={!visible ? true : undefined}
        hidden={collapsed && !visible}
      >
        <div
          ref={innerRef}
          role="status"
          aria-live="polite"
          className="update-banner-surface text-white shadow-sm"
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            <ArrowUpCircle aria-hidden className="hidden h-5 w-5 shrink-0 opacity-90 sm:block" />
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{headline ?? defaultHeadline}</span>
              <span className="hidden sm:inline">
                {' — '}
                {latest ? (
                  <ReleaseNotesPopover version={latest} notesUrl={notesUrl} />
                ) : (
                  <span className="font-semibold">{versionLabel}</span>
                )}
                {belowFloor && (
                  <span className="opacity-80">
                    {' — this version is no longer supported, please update to continue'}
                  </span>
                )}
              </span>
            </p>

            <button
              type="button"
              onClick={onUpdate}
              disabled={actionDisabled}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-3 py-1.5',
                'text-xs font-semibold text-slate-900 transition-colors hover:bg-white/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                'disabled:cursor-default disabled:opacity-60',
              )}
            >
              <RefreshCw aria-hidden className="h-3.5 w-3.5" />
              {actionLabel}
            </button>

            {!belowFloor && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss update notice"
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-md p-1',
                  'text-white/70 transition-colors hover:text-white',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                )}
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Desktop download progress — a thin translucent-white bar under the row. */}
          {showProgress && (
            <div
              className="h-1 w-full bg-white/25"
              role="progressbar"
              aria-label="Downloading update"
              aria-valuenow={downloadPercent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-white transition-[width] duration-200 ease-out motion-reduce:transition-none"
                style={{ width: `${downloadPercent ?? 0}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
