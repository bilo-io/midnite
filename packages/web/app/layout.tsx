import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { ConfirmProvider } from '@/components/confirm-dialog';
import { ToastProvider } from '@/components/toast';
import { ThemeProvider } from './theme/theme-context';
import { themeInitScript } from './theme/theme-script';

// Display font for the "midnite" wordmark, exposed as a CSS var consumed by the
// `font-brand` Tailwind utility.
const brand = localFont({
  src: './fonts/cyberwar.ttf',
  variable: '--font-brand',
  display: 'swap',
});

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
    <html lang="en" suppressHydrationWarning className={brand.variable}>
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
