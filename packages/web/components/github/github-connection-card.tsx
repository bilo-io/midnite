'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import type { GithubConnection, OAuthDeviceStartResponse } from '@midnite/shared';
import { Button, buttonVariants } from '@/components/ui/button';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import { GithubMark } from '@/components/source-icon';
import {
  disconnectGithub,
  getGithubConnection,
  pollGithubDeviceConnect,
  startGithubDeviceConnect,
} from '@/lib/api';

/** The credential name the connect flow stores under. */
const CREDENTIAL_NAME = 'GitHub';

type Phase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'awaiting'; start: OAuthDeviceStartResponse }
  | { kind: 'expired' }
  | { kind: 'denied' };

/**
 * Connect a GitHub account (Phase 84 Theme G, over Theme A's device grant).
 *
 * The card's job is to be **truthful about which token the install is actually
 * running on**, because they are not interchangeable. `GET /github/connection`
 * reports a `source`:
 *
 *  - `oauth` — a personal connection made here. The only one this card may
 *    disconnect: the other two aren't the user's to delete from a Settings card.
 *  - `pat` — a shared credential someone configured for the whole install.
 *    Calling that "your GitHub" would be a lie, and disconnecting it would pull
 *    the rug out from under every other user.
 *  - `gh-cli` — the gateway host's own `gh auth` session. Not a midnite
 *    credential at all; it lives and dies with the machine.
 *
 * Only the **device** grant is offered. The redirect grant exists in the gateway
 * but is deliberately unwired for GitHub — its callback can't attribute a
 * connection to a user (Theme A review) — so surfacing it would be offering a
 * path that produces the wrong thing.
 */
export function GithubConnectionCard() {
  const t = useTranslations('settings.github');
  const tCommon = useTranslations('common');
  const confirm = useConfirm();

  const [connection, setConnection] = useState<GithubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const errMsg = useCallback(
    (e: unknown): string => (e instanceof Error ? e.message : tCommon('errorTitle')),
    [tCommon],
  );

  const refresh = useCallback(async () => {
    try {
      setConnection(await getGithubConnection());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [errMsg]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Drop any in-flight poll when the card unmounts, so navigating away mid-flow
  // doesn't leave a timer firing against a dead component.
  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  const beginConnect = async () => {
    setError(null);
    setPhase({ kind: 'starting' });
    try {
      const start = await startGithubDeviceConnect(CREDENTIAL_NAME);
      setPhase({ kind: 'awaiting', start });
      schedulePoll(start);
    } catch (e) {
      setPhase({ kind: 'idle' });
      setError(errMsg(e));
    }
  };

  // Poll at the interval GitHub asked for. The gateway throttles forwarding anyway,
  // so an eager client can't trip a rate limit — but honouring the interval keeps the
  // request count honest.
  function schedulePoll(start: OAuthDeviceStartResponse) {
    const delay = Math.max(start.intervalSeconds, 1) * 1000;
    pollTimer.current = setTimeout(() => void runPoll(start), delay);
  }

  async function runPoll(start: OAuthDeviceStartResponse) {
    try {
      const result = await pollGithubDeviceConnect(start.deviceAuthId);
      if (result.status === 'pending') {
        schedulePoll(start);
        return;
      }
      if (result.status === 'expired') {
        setPhase({ kind: 'expired' });
        return;
      }
      if (result.status === 'denied') {
        setPhase({ kind: 'denied' });
        return;
      }
      setPhase({ kind: 'idle' });
      await refresh();
    } catch (e) {
      setPhase({ kind: 'idle' });
      setError(errMsg(e));
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the code is on screen to type, so this isn't worth an error.
    }
  };

  const doDisconnect = async () => {
    const ok = await confirm({
      title: t('disconnectTitle'),
      description: t('disconnectMessage'),
      confirmLabel: t('disconnect'),
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const result = await disconnectGithub();
      // Say what actually happened. Claiming a revoke that didn't run would leave a
      // live `repo`-scoped grant behind while telling the user it was gone.
      if (!result.revokedAtProvider && result.manageUrl) {
        setError(t('revokeManually', { url: result.manageUrl }));
      }
      await refresh();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {tCommon('loading')}
      </p>
    );
  }

  const source = connection?.connected ? connection.source : undefined;

  return (
    <section className="space-y-4 rounded-lg border border-border/60 bg-card/40 p-4">
      <header className="flex items-start gap-3">
        <GithubMark aria-hidden className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">{t('title')}</h3>
          <p className="text-xs text-muted-foreground">{t('description')}</p>
        </div>
      </header>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {connection?.connected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {connection.avatarUrl ? (
              // A plain <img>, not next/image: this is one 32px remote avatar and
              // next/image would need avatars.githubusercontent.com allow-listed in
              // the Next config for no benefit at this size.
              <img
                src={connection.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{connection.login ?? t('unknownUser')}</p>
              <p className="text-xs text-muted-foreground">{t(`source.${source ?? 'oauth'}`)}</p>
            </div>
          </div>

          {connection.scopes.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('scopes')}{' '}
              <span className="font-mono">{connection.scopes.join(', ')}</span>
            </p>
          ) : null}

          {source === 'oauth' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={busy}
              onClick={() => void doDisconnect()}
            >
              {busy ? <Loader2 aria-hidden className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              {t('disconnect')}
            </Button>
          ) : (
            // A shared PAT or the host's gh CLI isn't this user's to remove from here.
            <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              {t(`notYours.${source ?? 'pat'}`)}
            </p>
          )}
        </div>
      ) : phase.kind === 'awaiting' ? (
        <div className="space-y-3">
          <p className="text-sm">{t('deviceInstructions')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-lg tracking-widest"
              data-testid="device-user-code"
            >
              {phase.start.userCode}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => void copyCode(phase.start.userCode)}
            >
              {copied ? (
                <Check aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <Copy aria-hidden className="h-3.5 w-3.5" />
              )}
              {copied ? t('copied') : t('copy')}
            </Button>
            <a
              href={phase.start.verificationUri}
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ size: 'sm' }), 'h-8 gap-1.5')}
            >
              <ExternalLink aria-hidden className="h-3.5 w-3.5" />
              {t('openGithub')}
            </a>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> {t('waiting')}
          </p>
        </div>
      ) : phase.kind === 'expired' || phase.kind === 'denied' ? (
        <div className="space-y-3">
          {/* Neither is a failure of ours: the code timed out, or the user said no. */}
          <p className="text-sm text-muted-foreground">
            {phase.kind === 'expired' ? t('expired') : t('denied')}
          </p>
          <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => void beginConnect()}>
            <RefreshCw aria-hidden className="h-3.5 w-3.5" />
            {t('tryAgain')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('notConnected')}</p>
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            disabled={phase.kind === 'starting'}
            onClick={() => void beginConnect()}
          >
            {phase.kind === 'starting' ? (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <GithubMark aria-hidden className="h-3.5 w-3.5" />
            )}
            {t('connect')}
          </Button>
        </div>
      )}
    </section>
  );
}
