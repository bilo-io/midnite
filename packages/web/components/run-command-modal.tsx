'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Client-only loading fallback so the translated copy renders inside the provider. */
function StartingTerminal() {
  const t = useTranslations('common');
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {t('startingTerminal')}
    </div>
  );
}

// xterm.js touches the DOM — load the terminal view client-only, same as the
// session terminal / CliActionModal.
const LiveTerminal = dynamic(() => import('./live-terminal').then((m) => m.LiveTerminal), {
  ssr: false,
  loading: () => <StartingTerminal />,
});

type Props = {
  /** Header title, e.g. "Preview" or "Build". */
  title: string;
  /** Registers a standalone ad-hoc terminal server-side and returns its id. */
  start: () => Promise<{ terminalId: string }>;
  onClose: () => void;
};

/**
 * A standalone terminal (not tied to any session) that runs a server-built
 * command immediately on open — the Preview/Build actions on a project's detail
 * page. Modeled directly on {@link CliActionModal}; generalized to take any
 * `start()` call rather than a fixed CLI-install endpoint. Closing leaves the
 * PTY to be reaped on idle.
 */
export function RunCommandModal({ title, start, onClose }: Props) {
  const t = useTranslations('common');
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    start()
      .then(({ terminalId: id }) => {
        if (!cancelled) setTerminalId(id);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : `Failed to start ${title}`);
      });
    return () => {
      cancelled = true;
    };
    // `start` is expected to be stable-enough (a fresh closure per mount is fine —
    // we only want this to run once, on open).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="pointer-events-auto flex h-[80vh] max-h-[80vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center gap-3 border-b border-border/60 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold leading-tight">{title}</h2>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label={t('close')} onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 px-5 py-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : terminalId ? (
              <LiveTerminal attachId={terminalId} label={title} ariaLabel={`${title} terminal`} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {t('startingLabel', { label: title.toLowerCase() })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
