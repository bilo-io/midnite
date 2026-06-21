'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import type { SetupItemState, SetupStatus } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { getSetupStatus } from '@/lib/api';
import { SETUP_DOT, SETUP_ITEM_HREF } from '@/lib/setup-items';

/** The worst state across the checklist, for the at-a-glance summary badge. */
function worstState(status: SetupStatus): SetupItemState {
  if (status.items.some((i) => i.state === 'missing')) return 'missing';
  if (status.items.some((i) => i.state === 'warn')) return 'warn';
  return 'ok';
}

/**
 * Ongoing setup-readiness panel (Phase 19 Theme D). Renders the same
 * `SetupStatus` checklist as the first-run nudge (Theme C) as a permanent view
 * in Settings → System, with a deep-link per item. Reuses Theme A's endpoint —
 * the single source of truth for "are we set up" — and re-checks on focus so a
 * setup that breaks later (a revoked key, an uninstalled CLI) turns amber/red
 * here without a reload.
 */
export function SetupStatusPanel() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    getSetupStatus()
      .then((s) => {
        setStatus(s);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const badge = status ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: status.ready ? SETUP_DOT.ok : SETUP_DOT[worstState(status)] }}
        aria-hidden
      />
      {status.ready ? 'Ready' : 'Setup incomplete'}
    </span>
  ) : null;

  return (
    <Accordion
      title="Setup readiness"
      icon={<ShieldCheck className="h-3.5 w-3.5" />}
      action={badge}
      defaultOpen
    >
      <div className="space-y-4 p-5">
        <p className="text-xs text-muted-foreground/70">
          Whether this install can run agents — live provider, secret-key, agent-CLI, pool and repo
          state. The same checklist drives the first-run prompt.
        </p>

        {error ? (
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>Couldn’t load setup status — is the gateway running?</span>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        ) : !status ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> checking…
          </div>
        ) : (
          <ul className="space-y-3">
            {status.items.map((item) => {
              const done = item.state === 'ok';
              return (
                <li key={item.id} className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    {done ? (
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0"
                        style={{ color: SETUP_DOT.ok }}
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: SETUP_DOT[item.state] }}
                        aria-hidden
                      />
                    )}
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none">{item.label}</p>
                      {item.detail ? (
                        <p className="text-xs text-muted-foreground">{item.detail}</p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={SETUP_ITEM_HREF[item.id]}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {done ? 'Manage' : 'Fix'}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {status && !error ? (
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={loading ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} /> Re-check
          </button>
        ) : null}
      </div>
    </Accordion>
  );
}
