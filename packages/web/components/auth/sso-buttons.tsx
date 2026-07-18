'use client';

import { useEffect, useState } from 'react';
import type { LoginProvider } from '@midnite/shared';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchSsoProviders, ssoStartUrl } from '@/lib/api';

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

/**
 * Phase 70 D — "Continue with Google / GitHub" buttons for the login + register
 * pages. Fetches the gateway's configured providers on mount and renders one anchor
 * per provider (a full-page nav to the gateway's SSO start, like `getOAuthStartUrl`).
 * Renders nothing when SSO isn't configured, so password-only instances are
 * unchanged. `redirect` is the same-origin path to return to after login.
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

  // Nothing to show (still loading, or no SSO configured) → render nothing.
  if (!providers || providers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {providers.map((provider) => (
          <a
            key={provider}
            href={ssoStartUrl(provider, redirect)}
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full gap-2')}
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

function ProviderIcon({ provider }: { provider: LoginProvider }) {
  if (provider === 'google') {
    return (
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0024 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}
