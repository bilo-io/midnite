'use client';

import { useEffect, useState } from 'react';
import { LOGIN_PROVIDERS, type LoginProvider } from '@midnite/shared';
import { LockScreen } from '@midnite/shell';
import { GithubIcon, buttonVariants } from '@midnite/ui';
import { fetchSsoProviders, ssoStartUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

const PROVIDER_LABEL: Record<LoginProvider, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
};

/**
 * The admin login gate (Phase 73 Theme E). Reuses the shared SSO flow — the
 * configured providers are fetched from `GET /auth/sso/providers` and each button
 * full-page-navigates to the gateway's SSO start — rendered on the shell
 * `<LockScreen>` starfield. Minimal by design (not a copy of web's full login
 * page): the SSO buttons are always shown so sign-in is a visible, first-class
 * action; the server-reported set narrows them when available.
 */
export function LoginScreen() {
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
  const shown: readonly LoginProvider[] = providers && providers.length > 0 ? providers : LOGIN_PROVIDERS;

  return (
    <LockScreen label="Sign in to the operator console">
      <div className="flex w-full max-w-xs flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <span className="font-brand text-3xl text-foreground">midnite</span>
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">operator console</span>
        </div>
        <div className="flex w-full flex-col gap-2">
          {shown.map((provider) => (
            <a
              key={provider}
              href={ssoStartUrl(provider, '/')}
              data-testid={`sso-${provider}`}
              className={cn(buttonVariants({ variant: 'outline' }), 'h-11 w-full gap-2.5')}
            >
              {provider === 'github' ? <GithubIcon className="h-4 w-4" /> : null}
              {PROVIDER_LABEL[provider]}
            </a>
          ))}
        </div>
      </div>
    </LockScreen>
  );
}
