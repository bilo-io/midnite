'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { NeuroCloudBackground, PasscodeUnlockDialog, cn } from '@midnite/ui';

/**
 * The reusable lock shell both `web`'s idle screensaver and `admin`'s login gate
 * render on (Phase 73 Theme B). It owns the neuro-cloud starfield backdrop and the
 * **wake → passcode** unlock orchestration; everything data-bound (session counts,
 * host telemetry, the cycling title) is **injected** by the host via slots, so the
 * shell stays gateway-agnostic.
 *
 * - No passcode required (`requireCode={false}`): any key or a click dismisses
 *   (`onDismiss`) — the plain screensaver.
 * - Passcode required: the pad stays hidden until the first wake gesture, then the
 *   `PasscodeUnlockDialog` (from `@midnite/ui`) owns the keyboard; a correct code
 *   calls `onUnlock`.
 */
export type LockScreenProps = {
  /** When true, a correct passcode is required to leave; else any gesture dismisses. */
  requireCode?: boolean;
  /** The passcode to match (used only when `requireCode`). */
  passcode?: string;
  /** Called on a correct code (locked) — dismiss the lock. */
  onUnlock?: () => void;
  /** Called on any wake gesture when no code is required — dismiss the lock. */
  onDismiss?: () => void;
  /** Animate the starfield (host gates this on motion prefs); static when false. */
  animateBackground?: boolean;
  /** Centre content (spinner, cycling word, status pills) — host-provided. */
  children?: ReactNode;
  /** Absolutely-positioned corner widgets (clock, telemetry) — host-provided. */
  corners?: ReactNode;
  /** Accessible dialog label (default reflects the lock state). */
  label?: string;
};

export function LockScreen({
  requireCode = false,
  passcode = '',
  onUnlock,
  onDismiss,
  animateBackground = true,
  children,
  corners,
  label,
}: LockScreenProps) {
  // The unlock prompt stays hidden until a wake gesture, so a locked screen reads
  // clean rather than nagging with an always-visible pad.
  const [unlocking, setUnlocking] = useState(false);
  const dismissible = !requireCode;

  useEffect(() => {
    if (dismissible) {
      const onKey = () => onDismiss?.();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (!unlocking) {
      const onKey = () => setUnlocking(true);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [dismissible, unlocking, onDismiss]);

  return (
    <div
      role="dialog"
      aria-label={label ?? (requireCode ? 'Locked screen' : 'Screensaver')}
      onClick={dismissible ? onDismiss : !unlocking ? () => setUnlocking(true) : undefined}
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 px-6 text-center backdrop-blur-[120px]',
        dismissible || !unlocking ? 'cursor-pointer' : '',
      )}
    >
      {/* Neuro-cloud backdrop over the opaque blurred surface; static under reduced motion. */}
      <NeuroCloudBackground animate={animateBackground} />

      {corners}

      <div className="relative z-10 flex flex-col items-center">{children}</div>

      <p className="absolute bottom-2 z-10 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {requireCode ? 'press any key to unlock' : 'press any key to wake'}
      </p>

      {requireCode && unlocking ? (
        <PasscodeUnlockDialog
          expected={passcode}
          onUnlock={() => onUnlock?.()}
          onCancel={() => setUnlocking(false)}
        />
      ) : null}
    </div>
  );
}
