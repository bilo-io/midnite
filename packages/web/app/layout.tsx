import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { PwaRegister } from '@/components/pwa-register';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from './theme/theme-context';
import { AuthProvider } from '@/contexts/auth-context';
import { themeInitScript } from './theme/theme-script';

// Display fonts trialled for the "midnite" wordmark. Each is exposed as its own
// CSS var; the active one is chosen in Settings → Appearance → Logo and applied
// by <Wordmark />.
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
const rooster = localFont({ src: './fonts/rooster.ttf', variable: '--font-rooster', display: 'swap' });
const cassandra = localFont({ src: './fonts/cassandra.ttf', variable: '--font-cassandra', display: 'swap' });
const lemonJelly = localFont({ src: './fonts/lemon-jelly.ttf', variable: '--font-lemon-jelly', display: 'swap' });
const radeil3d = localFont({ src: './fonts/radeil-3d.otf', variable: '--font-radeil-3d', display: 'swap' });
const quicking = localFont({ src: './fonts/quicking.otf', variable: '--font-quicking', display: 'swap' });
const pardell = localFont({ src: './fonts/pardell.ttf', variable: '--font-pardell', display: 'swap' });
const octoberTwilight = localFont({ src: './fonts/october-twilight.ttf', variable: '--font-october-twilight', display: 'swap' });
const mollinaSignature = localFont({ src: './fonts/mollina-signature.ttf', variable: '--font-mollina-signature', display: 'swap' });
const campanaScript = localFont({ src: './fonts/campana-script.otf', variable: '--font-campana-script', display: 'swap' });
const majestic = localFont({ src: './fonts/majestic.ttf', variable: '--font-majestic', display: 'swap' });
const quickKiss = localFont({ src: './fonts/quick-kiss.ttf', variable: '--font-quick-kiss', display: 'swap' });
const dannyBrassco = localFont({ src: './fonts/danny-brassco.ttf', variable: '--font-danny-brassco', display: 'swap' });
const fasthin = localFont({ src: './fonts/fasthin.ttf', variable: '--font-fasthin', display: 'swap' });
const consultant = localFont({ src: './fonts/consultant.otf', variable: '--font-consultant', display: 'swap' });
const watermelonScript = localFont({ src: './fonts/watermelon-script.ttf', variable: '--font-watermelon-script', display: 'swap' });
const biteChocolate = localFont({ src: './fonts/bite-chocolate.ttf', variable: '--font-bite-chocolate', display: 'swap' });
const lovya = localFont({ src: './fonts/lovya.otf', variable: '--font-lovya', display: 'swap' });
const southernAire = localFont({ src: './fonts/southern-aire.ttf', variable: '--font-southern-aire', display: 'swap' });
const brooklyn = localFont({ src: './fonts/brooklyn.ttf', variable: '--font-brooklyn', display: 'swap' });
const bettaniSellia = localFont({ src: './fonts/bettani-sellia.otf', variable: '--font-bettani-sellia', display: 'swap' });
const amsterdam = localFont({ src: './fonts/amsterdam.ttf', variable: '--font-amsterdam', display: 'swap' });
const brotherlandSignature = localFont({ src: './fonts/brotherland-signature.otf', variable: '--font-brotherland-signature', display: 'swap' });
const heartRommatte = localFont({ src: './fonts/heart-rommatte.otf', variable: '--font-heart-rommatte', display: 'swap' });

const fontVariables = [
  cyberwar,
  signpainter,
  cannet,
  materialTheories,
  pabricks,
  cyberPunkCity,
  quantumSector,
  goretax,
  rooster,
  cassandra,
  lemonJelly,
  radeil3d,
  quicking,
  pardell,
  octoberTwilight,
  mollinaSignature,
  campanaScript,
  majestic,
  quickKiss,
  dannyBrassco,
  fasthin,
  consultant,
  watermelonScript,
  biteChocolate,
  lovya,
  southernAire,
  brooklyn,
  bettaniSellia,
  amsterdam,
  brotherlandSignature,
  heartRommatte,
]
  .map((f) => f.variable)
  .join(' ');

export const metadata: Metadata = {
  title: 'midnite',
  description: 'Multitask coding agents',
  applicationName: 'midnite',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  // Installed-PWA chrome on iOS: launch standalone (no Safari UI), a dark status
  // bar to match the app's default surface, and the app name on the home screen.
  appleWebApp: {
    capable: true,
    title: 'midnite',
    statusBarStyle: 'black-translucent',
  },
};

// Phase 24 (responsive/PWA): make the layout phone-aware. `width=device-width`
// lets breakpoints (lib/breakpoints.ts) take effect; pinch-zoom stays enabled
// for accessibility. `themeColor` tints the browser/OS chrome to match the
// surface — values mirror the `--background` token in globals.css (light vs
// `.dark`), so it follows the colour scheme instead of the old hardcoded white.
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
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        <PwaRegister />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ConfirmProvider>{children}</ConfirmProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
