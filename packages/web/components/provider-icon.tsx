import { cn } from '@/lib/utils';

type Props = {
  provider: string;
  size?: number;
  className?: string;
};

// Each provider: background colour, foreground colour, and an SVG icon path/content.
// The SVG is rendered on a 16×16 viewBox inside a rounded-md badge.
const PROVIDERS: Record<
  string,
  {
    bg: string;
    fg: string;
    // Return JSX so we can mix text + paths without a DSL
    icon: () => React.ReactNode;
  }
> = {
  anthropic: {
    bg: '#c17a50',
    fg: '#fff',
    icon: () => (
      // Upward-pointing chevron "A" shape
      <path
        d="M8 2.5L2.5 13.5h2.3L8 7.2l3.2 6.3h2.3L8 2.5zm-1.1 6.2h2.2L8 10.4 6.9 8.7z"
        fill="currentColor"
      />
    ),
  },
  openai: {
    bg: '#10a37f',
    fg: '#fff',
    icon: () => (
      // Simplified bloom: 4 petals rotated 45° around centre
      <>
        <ellipse cx="8" cy="4.2" rx="2.4" ry="3.2" fill="currentColor" opacity="0.9" />
        <ellipse cx="8" cy="4.2" rx="2.4" ry="3.2" fill="currentColor" opacity="0.9"
          transform="rotate(90 8 8)" />
        <ellipse cx="8" cy="4.2" rx="2.4" ry="3.2" fill="currentColor" opacity="0.9"
          transform="rotate(180 8 8)" />
        <ellipse cx="8" cy="4.2" rx="2.4" ry="3.2" fill="currentColor" opacity="0.9"
          transform="rotate(270 8 8)" />
        <circle cx="8" cy="8" r="2.2" fill="currentColor" />
      </>
    ),
  },
  'openai-compatible': {
    bg: '#52525b',
    fg: '#fff',
    icon: () => (
      // "</>" — a generic, vendor-neutral OpenAI-compatible endpoint
      <>
        <path
          d="M6.2 5 3.7 8l2.5 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.8 5l2.5 3-2.5 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  gemini: {
    bg: '#4285F4',
    fg: '#fff',
    icon: () => (
      // Google Gemini four-point star (brand path scaled from 24×24 to fit the badge)
      <path
        d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"
        fill="currentColor"
        transform="translate(2 2) scale(0.5)"
      />
    ),
  },
  stability: {
    bg: '#aaff00',
    fg: '#111',
    icon: () => (
      // Bold S path
      <path
        d="M10.8 5.2C10.2 4.2 9 3.6 7.8 3.6 6.2 3.6 5 4.5 5 5.8c0 1 .7 1.6 2.1 2.1l1 .4c1 .4 1.4.8 1.4 1.4 0 .8-.7 1.3-1.7 1.3-1 0-1.8-.5-2.3-1.4l-1.4.8C4.8 11.8 6.2 12.4 7.8 12.4c2 0 3.4-1.1 3.4-2.7 0-1.1-.7-1.9-2.2-2.4l-1-.4C7 6.5 6.6 6.2 6.6 5.7c0-.7.6-1.1 1.4-1.1.8 0 1.4.3 1.8 1L10.8 5.2z"
        fill="currentColor"
      />
    ),
  },
  flux: {
    bg: '#111',
    fg: '#e8e8e8',
    icon: () => (
      // Bold F
      <path
        d="M4.5 3v10h2V9h4.5V7.2H6.5V4.8H11V3H4.5z"
        fill="currentColor"
      />
    ),
  },
  runway: {
    bg: '#181818',
    fg: '#fff',
    icon: () => (
      // R with a tail
      <path
        d="M4.5 3v10h2V9.2L9.8 13h2.5L8.8 8.8c1-.4 1.7-1.4 1.7-2.4C10.5 4.6 9.2 3 7 3H4.5zm2 2.2h.8c.9 0 1.5.5 1.5 1.4 0 .8-.6 1.4-1.5 1.4h-.8V5.2z"
        fill="currentColor"
      />
    ),
  },
  kling: {
    bg: '#e53935',
    fg: '#fff',
    icon: () => (
      // K
      <path
        d="M4.5 3v10h2V9.2L10 13h2.5L8 8 12 3H9.6L6.5 7.2V3H4.5z"
        fill="currentColor"
      />
    ),
  },
  luma: {
    bg: '#6d28d9',
    fg: '#fff',
    icon: () => (
      // Stylised L
      <path
        d="M5 3v10h6.5v-2H7V3H5z"
        fill="currentColor"
      />
    ),
  },
  pika: {
    bg: '#0891b2',
    fg: '#fff',
    icon: () => (
      // Lightning bolt
      <path
        d="M10 2L4.5 9h4L6 14l7-8H9L10 2z"
        fill="currentColor"
      />
    ),
  },
  elevenlabs: {
    bg: '#f97316',
    fg: '#fff',
    icon: () => (
      // Sound-wave bars (3 vertical bars of different heights, centred)
      <>
        <rect x="3.5" y="5.5" width="2.5" height="5" rx="1.25" fill="currentColor" />
        <rect x="6.75" y="3" width="2.5" height="10" rx="1.25" fill="currentColor" />
        <rect x="10" y="5.5" width="2.5" height="5" rx="1.25" fill="currentColor" />
      </>
    ),
  },
  suno: {
    bg: '#059669',
    fg: '#fff',
    icon: () => (
      // Eighth note
      <path
        d="M11 3v6.5A2.5 2.5 0 1 1 9 7.1V5L5.5 6V4.5L11 3zM6.5 9.5a1 1 0 1 0 1 1 1 1 0 0 0-1-1z"
        fill="currentColor"
      />
    ),
  },
  meta: {
    bg: '#1877f2',
    fg: '#fff',
    icon: () => (
      // Meta infinity symbol (∞)
      <path
        d="M8 8C6.8 5.8 5.6 4.5 4.2 4.5A3.5 3.5 0 0 0 4.2 11.5C5.6 11.5 6.8 10.2 8 8ZM8 8C9.2 10.2 10.4 11.5 11.8 11.5A3.5 3.5 0 0 0 11.8 4.5C10.4 4.5 9.2 5.8 8 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    ),
  },
};

const FALLBACK = {
  bg: '#52525b',
  fg: '#fff',
  icon: () => null,
};

export function ProviderIcon({ provider, size = 16, className }: Props) {
  const config = PROVIDERS[provider] ?? FALLBACK;
  const radius = Math.round(size * 0.25);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect width="16" height="16" rx={radius} fill={config.bg} />
      <g color={config.fg}>{config.icon()}</g>
    </svg>
  );
}
