'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SsoRedirectPathSchema } from '@midnite/shared';
import { exchangeSsoCode } from '@/lib/auth-transport';

// Browser landing for the SSO callback (client half — see the BFF route at
// app/api/auth/sso/callback/route.ts). The gateway 302s here with a one-time
// `code` + the same-origin `redirect` path. We POST the code to the BFF route,
// which exchanges it and sets the httpOnly session cookie, then do a FULL
// navigation to the resume path so the AuthProvider remounts and restores the
// session from that cookie (mirroring the old 303's semantics).
//
// A client page — not a GET route handler — is what keeps the `output: 'export'`
// static build working (a dynamic GET handler can't be statically exported).
// `useSearchParams` needs a Suspense boundary under static export.

/** Re-validate the resume path (open-redirect guard); default to "/". */
function safeRedirect(raw: string | null): string {
  if (!raw) return '/';
  return SsoRedirectPathSchema.safeParse(raw).success ? raw : '/';
}

function SsoCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  // The exchange code is single-use; guard against a double-invoke (React strict
  // mode in dev) firing the exchange twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get('code');
    const redirect = safeRedirect(params.get('redirect'));
    if (!code) {
      router.replace('/login?sso_error=missing_code');
      return;
    }

    void (async () => {
      // BFF mode sets the httpOnly cookie; desktop stores the refresh token locally.
      // Either way the subsequent full navigation lets AuthProvider restore the session.
      const result = await exchangeSsoCode(code);
      if (!result.ok) {
        router.replace(`/login?sso_error=${result.message ?? 'exchange_failed'}`);
        return;
      }
      window.location.replace(redirect);
    })();
  }, [params, router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      }
    >
      <SsoCallbackInner />
    </Suspense>
  );
}
