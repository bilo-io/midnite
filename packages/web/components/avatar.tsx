'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Stable 32-bit hash of a string — deterministic per seed so a user always gets
 *  the same fallback colour across sessions/devices. */
function hashCode(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return h;
}

/** Up-to-two-letter initials: first + last word initial, else the first two
 *  characters of a single word. Falls back to "?" for an empty name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** HSL (h∈0..360, s/l∈0..1) → RGB 0..255. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

/** A deterministic background colour from the seed plus the text colour (black or
 *  white) that reads best against it, chosen via the YIQ perceived-brightness
 *  heuristic — so the initials stay legible whatever hue we land on. */
function fallbackColors(seed: string): { background: string; color: string } {
  const hue = ((hashCode(seed) % 360) + 360) % 360;
  const sat = 0.62;
  const light = 0.52;
  const [r, g, b] = hslToRgb(hue, sat, light);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return {
    background: `hsl(${hue} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%)`,
    color: yiq >= 140 ? '#000' : '#fff',
  };
}

type AvatarProps = {
  /** Display name — drives the initials and the deterministic fallback colour. */
  name: string;
  /** SSO provider image, if any. Falls back to initials on absence or load error. */
  src?: string | null;
  /** Seed for the fallback colour; defaults to `name`. Pass the email for stability
   *  across name edits. */
  seed?: string;
  className?: string;
};

/**
 * A user avatar: renders the SSO provider image when available, otherwise the
 * user's initials on a deterministic, per-user background with an
 * auto-contrasting (black/white) text colour. Size is controlled by the caller
 * via `className` (height/width/font-size utilities).
 */
export function Avatar({ name, src, seed, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  const { background, color } = fallbackColors(seed ?? (name || 'anonymous'));

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        className,
      )}
      style={showImage ? undefined : { background, color }}
    >
      {showImage ? (
        // Plain <img>: SSO URLs are external and next/image is `unoptimized` for
        // the static export, so a bare tag avoids any remote-domain config.
        <img
          src={src!}
          alt={name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden className="font-semibold leading-none">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
