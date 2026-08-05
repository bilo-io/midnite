'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { SetupItem } from '@midnite/shared';

/**
 * Phase 82 D — the setup-checklist label seam, the same shape as
 * `lib/project-template-labels.ts` and `lib/workflow-node-labels.ts`.
 *
 * `GET /setup/status` returns each item's `label` already rendered in English
 * (`setup.service.ts` composes it), and the gateway is i18n-agnostic by design —
 * the CLI's `midnite doctor` reads the same rows. So the web resolves
 * `setup.items.<id>.label` at the call site and falls back to the server's
 * English per key, which keeps a newly-added item id readable instead of
 * rendering a raw message key.
 *
 * `item.detail` is deliberately **not** seamed: it's free-form text the gateway
 * computes from live state ("claude not on PATH", "MIDNITE_SECRET_KEY set"),
 * not a value from a closed set, so there is no key to author. It stays English
 * — a documented gap alongside the Phaser canvas and xterm stream text.
 */
export function useSetupItemLabel(): (item: SetupItem) => string {
  const t = useTranslations('setup');
  return useMemo(() => {
    return (item) => {
      const key = `items.${item.id}.label`;
      return t.has(key) ? t(key) : item.label;
    };
  }, [t]);
}
