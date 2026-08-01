'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePresenceSummary } from '@/hooks/use-presence-summary';

/**
 * Phase 64 Theme F — the "who's in the office" dashboard widget. Polls the same
 * team-scoped presence summary as the nav pill (no socket held) and lists live
 * teammates + their room, linking to `/office`. Empty state nudges you to drop in.
 */

const KNOWN_SCENES = ['office', 'corner', 'arcade'] as const;

function tintCss(tint: number | null): string {
  return tint == null ? 'hsl(var(--muted-foreground))' : `#${tint.toString(16).padStart(6, '0')}`;
}

export function PresenceOfficeWidget() {
  const t = useTranslations('office');
  const { count, peers } = usePresenceSummary();

  const sceneLabel = (scene: string) =>
    (KNOWN_SCENES as readonly string[]).includes(scene) ? t(`scenes.${scene}`) : scene;

  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{t('presence.widgetTitle')}</span>
        <span className="ml-auto text-xs font-normal text-muted-foreground">{count}</span>
      </div>
      {count === 0 ? (
        <Link href="/office" className="flex flex-1 items-center justify-center rounded-md border border-dashed border-border/60 text-center text-xs text-muted-foreground hover:text-foreground">
          {t('presence.widgetEmpty')}
        </Link>
      ) : (
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto text-sm">
          {peers.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2 rounded px-1 py-0.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tintCss(p.tint) }} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted-foreground">{sceneLabel(p.scene)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
