'use client';

import { useEffect, useState } from 'react';
import { type LoginProvider, LOGIN_PROVIDERS } from '@midnite/shared';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchSsoProviders, ssoStartUrl } from '@/lib/api';

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
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
 */
export function SsoButtons({ redirect = '/' }: { redirect?: string }) {
  const [providers, setProviders] = useState<LoginProvider[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSsoProviders().then((p) => {
      if (active) setProviders(p);
    });
    return () => {
      active = false;
    };
  }, []);

  // Server-reported set when non-empty; else the full pair (loading / unconfigured).
  const shown: readonly LoginProvider[] =
    providers && providers.length > 0 ? providers : LOGIN_PROVIDERS;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {shown.map((provider) => (
          <a
            key={provider}
            href={ssoStartUrl(provider, redirect)}
            className={cn(buttonVariants({ variant: 'outline' }), 'h-11 w-full gap-2.5')}
            data-testid={`sso-${provider}`}
          >
            <ProviderIcon provider={provider} />
            {PROVIDER_LABEL[provider]}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
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
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.63 7.63 0 012-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
