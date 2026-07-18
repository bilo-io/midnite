'use client';

import { useEffect, useState } from 'react';
import { mediaUp } from '@/lib/breakpoints';

/**
 * The login-screen entry choreography (Phase 71 polish). One linear timeline,
 * exposed as a stage the auth layout + hero render against:
 *
 *   hidden → starfield fades in → logo fades in centre → a caret blinks in
 *   beside it → the wordmark types out → logo + wordmark glide to their
 *   resting spot → the hero title starts typing → the form cascades in.
 *
 * Stages are cumulative — renderers ask `introAtLeast(stage, 'x')`, never
 * equality — so a skipped intro ('done' immediately) shows everything.
 *
 * The intro plays once per browser session (sessionStorage), only on desktop
 * (the hero doesn't mount below `lg`), and only when motion is allowed —
 * otherwise it jumps straight to 'done' so the form is usable immediately.
 */

export type AuthIntroStage =
  | 'hidden'
  | 'starfield'
  | 'logo'
  | 'cursor'
  | 'wordmark'
  | 'move'
  | 'copy'
  | 'done';

const ORDER: readonly AuthIntroStage[] = [
  'hidden',
  'starfield',
  'logo',
  'cursor',
  'wordmark',
  'move',
  'copy',
  'done',
];

/** True when `stage` has reached (or passed) `target` on the intro timeline. */
export function introAtLeast(stage: AuthIntroStage, target: AuthIntroStage): boolean {
  return ORDER.indexOf(stage) >= ORDER.indexOf(target);
}

/** Stage → ms from timeline start. Spec beats: caret appears 1s after the logo,
 *  blinks twice (2 × ~700ms), the wordmark types on the "third flash". */
export const AUTH_INTRO_TIMELINE: readonly (readonly [AuthIntroStage, number])[] = [
  ['starfield', 0],
  ['logo', 500],
  ['cursor', 1500],
  ['wordmark', 2900],
  ['move', 3900],
  ['copy', 4700],
  ['done', 5000],
] as const;

export const AUTH_INTRO_SEEN_KEY = 'midnite.authIntroSeen';

export function useAuthIntro(animate: boolean): AuthIntroStage {
  const [stage, setStage] = useState<AuthIntroStage>('hidden');

  useEffect(() => {
    const timers: number[] = [];
    // Decide a tick after mount: the media query is read directly (not via
    // useIsDesktop, which is false on first paint) and storage is client-only.
    timers.push(
      window.setTimeout(() => {
        const desktop = window.matchMedia(mediaUp('lg')).matches;
        let seen = false;
        try {
          seen = window.sessionStorage.getItem(AUTH_INTRO_SEEN_KEY) === '1';
        } catch {
          // Storage unavailable — treat as unseen.
        }
        if (!animate || !desktop || seen) {
          setStage('done');
          return;
        }
        try {
          window.sessionStorage.setItem(AUTH_INTRO_SEEN_KEY, '1');
        } catch {
          // Best-effort — worst case the intro replays next visit.
        }
        for (const [s, at] of AUTH_INTRO_TIMELINE) {
          timers.push(window.setTimeout(() => setStage(s), at));
        }
      }, 30),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [animate]);

  return stage;
}
