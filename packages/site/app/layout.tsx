import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from './theme/theme-context';
import { themeInitScript } from './theme/theme-script';

// Display font for the "Midnite" wordmark — Quick Kiss, the brand face. Exposed
// as a CSS var so the `font-brand` Tailwind utility can apply it wherever the
// brand name shows. Mirrors the app's WORDMARK_LOGO_FONT (web/lib/wordmark-fonts.ts);
// keep the two in sync.
const brand = localFont({
  src: './fonts/quick-kiss.ttf',
  variable: '--font-brand',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://midnite-app.vercel.app'),
  title: 'Midnite AI Agent Manager',
  description:
    'A task orchestrator wrapped around a pool of Claude Code agents. Drop in a list, let Midnite classify and queue it, and run every task in parallel. Tracked on one live board.',
  // Favicons copied from packages/web/public/ (source of truth there) so the site
  // and the app share one brand mark; wired identically to the web layout.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Midnite AI Agent Manager',
    description:
      'Drop in a freeform list. Midnite classifies, queues, and runs every task across a pool of agents. Tracked on one live board.',
    type: 'website',
    url: 'https://midnite-app.vercel.app',
    siteName: 'Midnite',
    images: [
      {
        url: '/opengraph-banner.png',
        width: 1200,
        height: 630,
        alt: 'Midnite AI Agent Manager',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Midnite AI Agent Manager',
    description: 'Run Claude Code in parallel. A task orchestrator for a pool of agents.',
    images: ['/opengraph-banner.png'],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The resolved theme class is applied before paint by themeInitScript (no flash);
  // ThemeProvider then keeps it in sync. suppressHydrationWarning because the script
  // mutates <html> before React hydrates. Tokens in globals.css drive both themes.
  return (
    <html lang="en" suppressHydrationWarning className={brand.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
