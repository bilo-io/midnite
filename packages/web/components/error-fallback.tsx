'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { githubIssuesNewUrl } from '@midnite/shared';
import { Button } from '@/components/ui/button';

/**
 * The recovery UI shown by the App Router `error.tsx` boundaries.
 *
 * Before this existed there were no error boundaries anywhere in web/ui/shell,
 * so any render exception blanked the whole app — and took the Report Issue
 * button down with it, since that button lives in the same React tree that just
 * died. The support path was unavailable exactly when it was needed.
 *
 * Everything here is therefore deliberately self-sufficient: it links straight
 * out to GitHub with the digest prefilled rather than mounting the in-app
 * reporter, which depends on providers that may be part of what broke.
 */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  // `digest` is the only identifier that survives to production — Next replaces
  // the message with a generic string in prod builds to avoid leaking server
  // internals, so a report without it is not actionable.
  const issueUrl = githubIssuesNewUrl({
    title: `[crash] ${error.message || 'Unhandled render error'}`,
    body: [
      '### What happened',
      '',
      '<!-- What were you doing when this appeared? -->',
      '',
      '### Error',
      '',
      '```',
      error.message || '(no message)',
      error.digest ? `digest: ${error.digest}` : '',
      '```',
    ].join('\n'),
  });

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>

      <div className="max-w-md space-y-1.5">
        <h1 className="text-lg font-semibold">{t('errorBoundary.heading')}</h1>
        <p className="text-sm text-muted-foreground">{t('errorBoundary.description')}</p>
      </div>

      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          {t('errorBoundary.digest', { digest: error.digest })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          {t('errorBoundary.retry')}
        </Button>
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-md border border-border/60 px-4 text-sm hover:bg-accent"
        >
          {t('errorBoundary.report')}
        </a>
      </div>
    </div>
  );
}
