'use client';

import { useTranslations } from 'next-intl';

/**
 * The xterm bundle's loading placeholder. Split out of `session-terminal.tsx` so
 * the `dynamic()` call's `loading` callback can read the catalog — a hook can't be
 * called from inside that option object itself.
 */
export function TerminalStarting() {
  const t = useTranslations('sessions');
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {t('terminal.starting')}
    </div>
  );
}
