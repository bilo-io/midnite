import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { appearanceInitScript } from '@midnite/shell';
import './globals.css';
import { themeInitScript } from './theme/theme-script';
import { Providers } from '@/components/providers';

// The wordmark display font. Admin ships only what it needs — the "midnite"
// wordmark font (exposed as `--font-brand`) plus the platform system stack for UI
// text — not web's 30+ display-font trial set. Cassandra is the face web's
// wordmark is hard-coded to (see web/lib/wordmark-fonts.ts WORDMARK_LOGO_FONT);
// keep the two in sync.
const cassandra = localFont({ src: './fonts/cassandra.ttf', variable: '--font-brand', display: 'swap' });

export const metadata: Metadata = {
  title: 'midnite · operator',
  description: 'midnite operator console',
  applicationName: 'midnite operator',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cassandra.variable}>
      <head>
        {/* Pre-paint no-flash init: theme (.dark class) then the appearance runtime. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      {/* suppressHydrationWarning: browser extensions inject <body> attributes
          before React hydrates. */}
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
