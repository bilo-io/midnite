'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpCircle, RefreshCw, X } from 'lucide-react';

import { cn } from '@/lib/utils';

export type UpdateBannerViewProps = {
  /** Render the banner open (animates in) vs collapsed (animates out). */
  visible: boolean;
  /** Below the force-update floor: the banner can't be dismissed (no ×). */
  belowFloor: boolean;
  /** Latest version string, shown as `v…`. */
  latest: string | null;
  /** Optional release-notes URL — turns the version into a link. */
  notesUrl?: string;
  onUpdate: () => void;
  onDismiss: () => void;
};

/**
 * Presentational "App update available" banner (Phase 71 Theme C). Theme-*inverted*
 * surface (`bg-foreground`/`text-background`) for contrast, animates in/out with an
 * ease-in-out height transition (grid-rows 0fr↔1fr, reduced-motion aware), and
 * publishes its measured height as `--update-banner-h` so the fixed nav can offset
 * its `top` and nothing is occluded. Stateless — the container wires it to context.
 */
export function UpdateBannerView({
  visible,
  belowFloor,
  latest,
  notesUrl,
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
  }, [visible, latest, belowFloor]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--update-banner-h', visible ? `${height}px` : '0px');
    return () => {
      root.style.setProperty('--update-banner-h', '0px');
    };
  }, [visible, height]);

  const versionLabel = latest ? `v${latest}` : 'the latest version';

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
          className="flex items-center gap-3 bg-foreground px-4 py-2.5 text-background shadow-sm"
        >
          <ArrowUpCircle aria-hidden className="hidden h-5 w-5 shrink-0 opacity-90 sm:block" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-medium">
              {belowFloor ? 'A required update is available' : 'A new version is available'}
            </span>
            <span className="hidden sm:inline">
              {' — '}
              {notesUrl ? (
                <a
                  href={notesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline underline-offset-2 hover:opacity-80"
                >
                  {versionLabel}
                </a>
              ) : (
                <span className="font-semibold">{versionLabel}</span>
              )}
            </span>
          </p>

          <button
            type="button"
            onClick={onUpdate}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-md bg-background px-3 py-1.5',
              'text-xs font-semibold text-foreground transition-opacity hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70',
            )}
          >
            <RefreshCw aria-hidden className="h-3.5 w-3.5" />
            Update
          </button>

          {!belowFloor && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss update notice"
              className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-md p-1',
                'text-background/70 transition-colors hover:text-background',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70',
              )}
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
