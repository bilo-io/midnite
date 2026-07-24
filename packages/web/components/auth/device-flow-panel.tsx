'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import type { LoginProvider, SsoDeviceStartResponse } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { pollSsoDeviceAuth, ssoErrorMessage, startSsoDeviceAuth } from '@/lib/api';
import { writeLastLoginMethod } from '@/lib/last-login-method';

type Phase =
  | { kind: 'starting' }
  | { kind: 'waiting'; start: SsoDeviceStartResponse }
  | { kind: 'failed'; code: string };

/**
 * Inline GitHub **device-flow** login (the secretless path a bare install uses —
 * no operator config, no client secret on the machine). Swapped into the login
 * card in place of the SSO buttons: shows the user code to enter at
 * github.com/login/device, polls the gateway until the grant lands, then applies
 * the returned session and heads home. `onCancel` restores the buttons.
 */
export function DeviceFlowPanel({
  provider,
  onCancel,
}: {
  provider: LoginProvider;
  onCancel: () => void;
}) {
  const t = useTranslations('auth');
  const router = useRouter();
  const { applySession } = useAuth();
  const [phase, setPhase] = useState<Phase>({ kind: 'starting' });
  const [copied, setCopied] = useState(false);
  // Guard the initial start against React strict-mode's double effect-invoke —
  // a second start would orphan the first GitHub code.
  const startedRef = useRef(false);

  const begin = useCallback(() => {
    setPhase({ kind: 'starting' });
    setCopied(false);
    void startSsoDeviceAuth(provider)
      .then((start) => setPhase({ kind: 'waiting', start }))
      .catch(() => setPhase({ kind: 'failed', code: 'provider_unavailable' }));
  }, [provider]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    begin();
  }, [begin]);

  // Poll the gateway while waiting. The gateway throttles its own calls to the
  // provider, so a fixed client cadence is safe.
  useEffect(() => {
    if (phase.kind !== 'waiting') return;
    const { deviceAuthId, intervalSeconds, expiresInSeconds } = phase.start;
    const deadline = Date.now() + expiresInSeconds * 1000;
    let stopped = false;

    const timer = setInterval(() => {
      if (stopped) return;
      if (Date.now() > deadline) {
        setPhase({ kind: 'failed', code: 'device_expired' });
        return;
      }
      void pollSsoDeviceAuth(deviceAuthId)
        .then(async (result) => {
          if (stopped) return;
          if (result.status === 'pending') return;
          if (result.status === 'complete') {
            stopped = true;
            await applySession(result.auth);
            writeLastLoginMethod(provider);
            router.push('/');
            return;
          }
          const code =
            result.status === 'denied'
              ? 'access_denied'
              : result.status === 'expired'
                ? 'device_expired'
                : result.code;
          setPhase({ kind: 'failed', code });
        })
        .catch(() => {
          // Transient poll failure (gateway hiccup) — keep waiting; the deadline
          // above still bounds the flow.
        });
    }, intervalSeconds * 1000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [phase, applySession, provider, router]);

  const copyCode = () => {
    if (phase.kind !== 'waiting') return;
    void navigator.clipboard
      .writeText(phase.start.userCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard unavailable — the code is still visible to copy by hand.
      });
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
      {phase.kind === 'starting' && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('deviceStarting')}
        </div>
      )}

      {phase.kind === 'waiting' && (
        <>
          <p className="text-sm text-muted-foreground">{t('deviceEnterCode')}</p>
          <div className="flex items-center justify-center gap-2">
            <span
              className="select-all rounded-md border border-border bg-background px-4 py-2 font-mono text-xl font-semibold tracking-[0.2em]"
              data-testid="device-user-code"
            >
              {phase.start.userCode}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={copyCode}
              aria-label={t('deviceCopyCode')}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <a
            href={phase.start.verificationUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            {t('deviceOpenProvider')}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            {t('deviceWaiting')}
          </div>
        </>
      )}

      {phase.kind === 'failed' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <p role="alert" className="text-center text-sm text-red-500">
            {phase.code === 'device_expired'
              ? t('deviceExpired')
              : (ssoErrorMessage(phase.code) ?? t('deviceFailed'))}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={begin}>
            {t('deviceRetry')}
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {t('deviceBack')}
      </button>
    </div>
  );
}
