'use client';

/* eslint-disable i18next/no-literal-string --
 * global-error.tsx REPLACES the root layout, which is where LocaleProvider is
 * mounted — so `useTranslations` would throw here and turn a recoverable crash
 * into an unrecoverable one. This is the last line of defence before a blank
 * page, so its copy is deliberately hardcoded English with no provider, no
 * design-system import and no data fetching. Keep it dependency-free.
 */

/**
 * Catches errors thrown by the root layout itself (fonts, providers, the
 * appearance/locale init scripts). Next requires it to render its own
 * `<html>`/`<body>`, since the layout that normally supplies them is the thing
 * that failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0b0f',
          color: '#e5e5ea',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          padding: '2rem',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            Midnite hit an unexpected error
          </h1>
          <p style={{ fontSize: '0.875rem', opacity: 0.7, margin: '0 0 1.5rem' }}>
            The app failed to start up. Reloading usually fixes it; if it keeps happening, please
            report it with the reference below.
          </p>
          {error.digest ? (
            <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', opacity: 0.6 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <div
            style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: '#e5e5ea',
                color: '#0b0b0f',
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="https://github.com/bilo-io/midnite-app/issues/new"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid rgba(229,229,234,0.3)',
                color: '#e5e5ea',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Report it
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
