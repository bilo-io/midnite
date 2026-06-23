'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Check, Rocket, X } from 'lucide-react';
import type { SetupStatus } from '@midnite/shared';
import { buttonVariants } from '@/components/ui/button';
import { getSetupStatus } from '@/lib/api';
import { SETUP_DOT, SETUP_ITEM_HREF } from '@/lib/setup-items';

// Session-scoped so a dismiss lasts the browsing session and the nudge returns
// in a fresh session while setup is still incomplete (Decision §4 — the
// localStorage/session fallback; the server-side per-install marker lands with
// the wizard in Theme B).
const DISMISS_KEY = 'midnite.setup-nudge.dismissed';

/**
 * A soft, dismissible first-run nudge (Phase 19 Theme C). When the install isn't
 * `ready` it floats a compact readiness checklist with deep-links into settings.
 * It **never blocks the board** (Decision §2) — it's a corner card, hidden on the
 * settings routes (the ongoing Status panel, Theme D, owns the in-settings view),
 * and dismissible for the session. Rendered once in the main layout so it covers
 * every primary surface.
 */
export function SetupNudge({ onOpenWizard }: { onOpenWizard?: () => void }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  // Assume dismissed until the session flag is read, so a prior dismiss never
  // flashes the card on mount.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true');
    } catch {
      setDismissed(false);
    }
  }, []);

  const refresh = useCallback(() => {
    // Fail-open: a fetch error never nags (matches the LLM/inference fail-open).
    getSetupStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Fetch on mount + on window focus, so a setup that regresses (a revoked key,
  // an uninstalled CLI) re-surfaces the nudge without a reload.
  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // ignore unavailable storage
    }
  };

  if (!status || status.ready || dismissed) return null;
  if (pathname?.startsWith('/settings')) return null;

  const blockers = status.items.filter((item) => item.state === 'missing');
  const primary = blockers[0] ?? status.items.find((item) => item.state !== 'ok');
  const primaryHref = primary ? SETUP_ITEM_HREF[primary.id] : '/settings';

  return (
    <div
      role="region"
      aria-label="Finish setting up midnite"
      className="animate-dialog-in fixed bottom-4 right-4 z-40 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Rocket className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-snug">Finish setting up midnite</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {blockers.length > 0
              ? `${blockers.length} step${blockers.length === 1 ? '' : 's'} left before agents can run.`
              : 'A couple of recommended steps remain.'}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="mt-3 space-y-1">
        {status.items.map((item) => {
          const done = item.state === 'ok';
          const inner = (
            <span className="flex items-center gap-2 text-xs">
              {done ? (
                <Check className="h-3.5 w-3.5 shrink-0" style={{ color: SETUP_DOT.ok }} />
              ) : (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: SETUP_DOT[item.state] }}
                  aria-hidden
                />
              )}
              <span className={done ? 'text-muted-foreground line-through' : 'font-medium'}>
                {item.label}
              </span>
              {!done && item.detail ? (
                <span className="truncate text-muted-foreground/70">— {item.detail}</span>
              ) : null}
            </span>
          );
          return (
            <li key={item.id}>
              {done ? (
                <span className="block py-0.5">{inner}</span>
              ) : (
                <Link
                  href={SETUP_ITEM_HREF[item.id]}
                  className="block rounded-md py-0.5 transition-colors hover:text-foreground"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex justify-end">
        {onOpenWizard ? (
          <button
            type="button"
            onClick={onOpenWizard}
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            Open setup wizard <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </button>
        ) : (
          <Link href={primaryHref} className={buttonVariants({ variant: 'default', size: 'sm' })}>
            {primary ? `Set up ${primary.label}` : 'Open settings'}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
