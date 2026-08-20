'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type LoginProvider, LOGIN_PROVIDERS } from '@midnite/shared';
import { GradientGlow } from '@midnite/ui';
import { buttonVariants } from '@/components/ui/button';
import { GithubMark } from '@/components/github/github-mark';
import { cn } from '@/lib/utils';
import { fetchSsoProviders, ssoStartUrl, type SsoLoginOptions } from '@/lib/api';
import { readLastLoginMethod, writeLastLoginMethod } from '@/lib/last-login-method';
import { DeviceFlowPanel } from './device-flow-panel';

/** Vendor names are proper nouns — not translated; only the surrounding copy is. */
const PROVIDER_NAME: Record<LoginProvider, string> = {
  google: 'Google',
  github: 'GitHub',
};

/** Per-provider glow palette: Google wears the full rainbow (the default
 *  `gradient-border` conic), GitHub a grayscale override (globals.css). */
const PROVIDER_GLOW: Record<LoginProvider, string | undefined> = {
  google: undefined,
  github: 'gradient-border--mono',
};

/**
 * Phase 70 D — "Continue with Google / GitHub" buttons for the login + register
 * pages. Full-page nav to the gateway's SSO start (like `getOAuthStartUrl`).
 *
 * The buttons are **always shown** so SSO is a visible, first-class login method.
 * When the gateway reports a configured provider set (`GET /auth/sso/providers`),
 * we narrow to exactly those; while loading, or when the gateway reports none
 * (SSO not yet configured / JWT off), we fall back to both — a click on an
 * unconfigured provider gets a friendly `sso_error` from the gateway rather than a
 * missing button. `redirect` is the same-origin path to return to after login.
 *
 * Hovering a button lights the app's gradient glow in the provider's palette
 * (Google rainbow, GitHub grayscale). The method last used to sign in (stored in
 * localStorage, incl. 'email' — see `last-login-method.ts`) keeps its button's
 * glow lit on arrival with a small "Last used" tag.
 */
export function SsoButtons({ redirect = '/' }: { redirect?: string }) {
  const t = useTranslations('auth');
  const [options, setOptions] = useState<SsoLoginOptions | null>(null);
  // Read after mount — localStorage is unavailable during the static prerender.
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  // Non-null while the secretless device flow is in progress — it swaps the
  // buttons out for the inline code panel.
  const [deviceProvider, setDeviceProvider] = useState<LoginProvider | null>(null);

  useEffect(() => {
    setLastUsed(readLastLoginMethod());
    let active = true;
    void fetchSsoProviders().then((p) => {
      if (active) setOptions(p);
    });
    return () => {
      active = false;
    };
  }, []);

  // Server-reported set when non-empty; else the full pair (loading / unconfigured).
  const reported: readonly LoginProvider[] = options
    ? [...options.providers, ...options.deviceProviders]
    : [];
  const shown: readonly LoginProvider[] = reported.length > 0 ? reported : LOGIN_PROVIDERS;
  const deviceSet = new Set(options?.deviceProviders ?? []);

  if (deviceProvider) {
    return (
      <div className="flex flex-col gap-3">
        <DeviceFlowPanel provider={deviceProvider} onCancel={() => setDeviceProvider(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {shown.map((provider) => {
          const inner = (
            <>
              <ProviderIcon provider={provider} />
              {t('continueWith', { provider: PROVIDER_NAME[provider] })}
              {lastUsed === provider && <LastUsedTag />}
            </>
          );
          const buttonClass = cn(
            buttonVariants({ variant: 'ghost' }),
            // Neutral hover (not the accent wash) — the glow border is the
            // hover affordance here.
            'relative h-11 w-full gap-2.5 rounded-lg bg-background hover:bg-muted/60 hover:text-foreground',
          );
          return (
            <GradientGlow
              key={provider}
              trigger="hover"
              className={cn(
                'rounded-lg',
                PROVIDER_GLOW[provider],
                lastUsed === provider && 'gradient-border--always',
              )}
            >
              {deviceSet.has(provider) ? (
                // Secretless device flow: swap in the code panel, no navigation.
                <button
                  type="button"
                  onClick={() => setDeviceProvider(provider)}
                  className={buttonClass}
                  data-testid={`sso-${provider}`}
                >
                  {inner}
                </button>
              ) : (
                <a
                  href={ssoStartUrl(provider, redirect)}
                  onClick={() => writeLastLoginMethod(provider)}
                  className={buttonClass}
                  data-testid={`sso-${provider}`}
                >
                  {inner}
                </a>
              )}
            </GradientGlow>
          );
        })}
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t('or')}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

/** Tiny right-aligned "last" tag inside a highlighted login button. Absolutely
 *  positioned so it never shifts the button's centred label + logo. */
export function LastUsedTag() {
  const t = useTranslations('auth');
  return (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
      {t('lastUsedShort')}
    </span>
  );
}

/** Official brand marks (exact vendor paths) so the buttons read as first-party. */
function ProviderIcon({ provider }: { provider: LoginProvider }) {
  if (provider === 'google') {
    return (
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
        <path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
        />
        <path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
        />
        <path
          fill="#FBBC05"
          d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
        />
        <path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
        />
      </svg>
    );
  }
  return <GithubMark />;
}
