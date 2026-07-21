import type { ReactElement } from 'react';
import type { Locale } from '@midnite/shared';
import { cn } from '@/lib/utils';

/**
 * A small circular country flag for a locale (Phase 79 Theme C).
 *
 * Hand-drawn inline SVGs clipped to a circle rather than emoji flags — emoji flags
 * don't render as flags on every platform (notably Windows), and these stay crisp
 * at rail-icon size. Decorative by default (`aria-hidden`): the switcher supplies
 * the accessible language name on its trigger.
 */
export function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  const clip = `flag-clip-${locale}`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-5 w-5 shrink-0 rounded-full ring-1 ring-border/50', className)}
      aria-hidden
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{FLAGS[locale]}</g>
    </svg>
  );
}

const FLAGS: Record<Locale, ReactElement> = {
  // Union Jack: blue field, white then red saltires, white then red crosses.
  'en-GB': (
    <>
      <rect width="24" height="24" fill="#012169" />
      <path d="M0 0 L24 24 M24 0 L0 24" stroke="#fff" strokeWidth="5" />
      <path d="M0 0 L24 24 M24 0 L0 24" stroke="#C8102E" strokeWidth="2" />
      <path d="M12 0 V24 M0 12 H24" stroke="#fff" strokeWidth="7" />
      <path d="M12 0 V24 M0 12 H24" stroke="#C8102E" strokeWidth="4" />
    </>
  ),
  // Germany: black / red / gold horizontal bands.
  'de-DE': (
    <>
      <rect width="24" height="8" y="0" fill="#000000" />
      <rect width="24" height="8" y="8" fill="#DD0000" />
      <rect width="24" height="8" y="16" fill="#FFCE00" />
    </>
  ),
  // France: blue / white / red vertical bands.
  'fr-FR': (
    <>
      <rect width="8" height="24" x="0" fill="#0055A4" />
      <rect width="8" height="24" x="8" fill="#FFFFFF" />
      <rect width="8" height="24" x="16" fill="#EF4135" />
    </>
  ),
  // Spain: red / yellow (double height) / red horizontal bands.
  'es-ES': (
    <>
      <rect width="24" height="6" y="0" fill="#AA151B" />
      <rect width="24" height="12" y="6" fill="#F1BF00" />
      <rect width="24" height="6" y="18" fill="#AA151B" />
    </>
  ),
};
