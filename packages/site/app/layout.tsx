import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';

// Display font for the "midnite" wordmark. Exposed as a CSS var so the
// `font-brand` Tailwind utility can apply it wherever the brand name shows.
const brand = localFont({
  src: './fonts/cyberwar.ttf',
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://midnite.dev'),
  title: 'midnite — Multitask Claude Code',
  description:
    'A task orchestrator wrapped around a pool of Claude Code agents. Drop in a list, let midnite classify and queue it, and run every task in parallel — tracked on one live board.',
  openGraph: {
    title: 'midnite — Multitask Claude Code',
    description:
      'Drop in a freeform list. midnite classifies, queues, and runs every task across a pool of agents — tracked on one live board.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'midnite — Multitask Claude Code',
    description: 'Run Claude Code in parallel. A task orchestrator for a pool of agents.',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Marketing site is dark-only — the class is hardcoded rather than driven by a
  // theme switcher. Tokens in globals.css keep a light variant one line away.
  return (
    <html lang="en" className={`dark ${brand.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
