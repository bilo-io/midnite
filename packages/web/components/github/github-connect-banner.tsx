'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GithubMark } from '@/components/source-icon';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getGithubConnection } from '@/lib/api';

/**
 * Prompt to connect GitHub, shown above the repo list when nothing resolves
 * (Phase 84 Theme G).
 *
 * The trigger is `connected: false` from `GET /github/connection` — "can midnite
 * see your repos?" — rather than "does a `github-oauth` credential row exist".
 * That's the question the user actually has, and it stays correct however the
 * install is authenticated: a shared PAT or the host's `gh` CLI both count as
 * connected, so the banner doesn't nag someone whose repo browser already works.
 *
 * Renders nothing while loading, and nothing on error: a failed probe is not
 * evidence that the user needs to connect, and guessing wrong here means
 * shouting at someone who is already set up.
 */
export function GithubConnectBanner() {
  const t = useTranslations('settings.github');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const connection = await getGithubConnection(controller.signal);
        setShow(!connection.connected);
      } catch {
        setShow(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (!show) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border/70 bg-card/40 p-3">
      <GithubMark aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">{t('bannerPrompt')}</p>
      <Link
        href="/settings/integrations"
        className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'h-7 gap-1.5 text-xs')}
      >
        {t('bannerAction')}
        <ArrowRight aria-hidden className="h-3 w-3" />
      </Link>
    </div>
  );
}
