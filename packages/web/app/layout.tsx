import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from './theme/theme-context';
import { themeInitScript } from './theme/theme-script';

// Display fonts trialled for the "midnite" wordmark. Each is exposed as its own
// CSS var; the active one is chosen on /branding and applied by <Wordmark />.
// `cyberwar` keeps the legacy `--font-brand`/`font-brand` name so existing usage
// stays valid. Loaded once here; only the wordmark's rendered font varies.
const cyberwar = localFont({ src: './fonts/cyberwar.ttf', variable: '--font-brand', display: 'swap' });
const signpainter = localFont({ src: './fonts/signpainter.ttf', variable: '--font-signpainter', display: 'swap' });
const cannet = localFont({ src: './fonts/cannet-agency.ttf', variable: '--font-cannet', display: 'swap' });
const materialTheories = localFont({ src: './fonts/material-theories.ttf', variable: '--font-material-theories', display: 'swap' });
const pabricks = localFont({ src: './fonts/pabricks.ttf', variable: '--font-pabricks', display: 'swap' });
const cyberPunkCity = localFont({ src: './fonts/cyber-punk-city.otf', variable: '--font-cyber-punk-city', display: 'swap' });
const quantumSector = localFont({ src: './fonts/quantum-sector.ttf', variable: '--font-quantum-sector', display: 'swap' });
const goretax = localFont({ src: './fonts/goretax.ttf', variable: '--font-goretax', display: 'swap' });

const fontVariables = [
  cyberwar,
  signpainter,
  cannet,
  materialTheories,
  pabricks,
  cyberPunkCity,
  quantumSector,
  goretax,
]
  .map((f) => f.variable)
  .join(' ');

export const metadata: Metadata = {
  title: 'midnite',
  description: 'Multitask coding agents',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
