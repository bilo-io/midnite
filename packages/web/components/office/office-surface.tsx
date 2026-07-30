'use client';

import { Box, Building2, type LucideIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { Office3DView } from '@/components/office3d/office-3d-view';
import { OfficeView } from '@/components/office/office-view';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
  type OfficeView as OfficeViewMode,
} from '@/lib/app-settings';
import { useLocalStorage } from '@/lib/use-local-storage';
import { cn } from '@/lib/utils';

const VIEWS: { value: OfficeViewMode; labelKey: 'surface.view2d' | 'surface.view3d'; Icon: LucideIcon }[] = [
  { value: '2d', labelKey: 'surface.view2d', Icon: Building2 },
  { value: '3d', labelKey: 'surface.view3d', Icon: Box },
];

function isOfficeView(v: string | null): v is OfficeViewMode {
  return v === '2d' || v === '3d';
}

/**
 * Phase 63 F — the `/office` engine switcher. A 2D / 3D tab strip picks which
 * office engine mounts; the choice is a shareable `?view=2d|3d` URL param that
 * **wins** over the persisted preference, else falls back to `settings.officeView`
 * (synced via Phase-43 UserPreferences), else `2d`. Only the active engine is
 * mounted, so switching fully tears the other down (Phaser destroy / three
 * dispose) and only one engine bundle loads — both are `dynamic(ssr:false)`.
 */
export function OfficeSurface() {
  const t = useTranslations('office');
  const router = useRouter();
  const params = useSearchParams();
  const [settings, setSettings] = useLocalStorage<AppSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

  const param = params.get('view');
  const active: OfficeViewMode = isOfficeView(param) ? param : settings.officeView;

  const select = useCallback(
    (view: OfficeViewMode) => {
      if (view === active) return;
      // URL is the shareable source of truth for the current view; replace so
      // toggling doesn't spam browser history.
      const next = new URLSearchParams(Array.from(params.entries()));
      next.set('view', view);
      router.replace(`?${next.toString()}`);
      // Persist so the choice sticks across visits + devices (Phase 43 sync).
      setSettings((prev) => ({ ...prev, officeView: view }));
    },
    [active, params, router, setSettings],
  );

  return (
    <div className="space-y-4">
      {/* Pin the 2D/3D switcher under the collapsed header (top-12) so it stays
          reachable while the office scene scrolls behind it — the app-wide sticky
          pattern (StickyToolbar / council cockpit). */}
      <div className="sticky top-12 z-20 bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div
          role="tablist"
          aria-label={t('surface.viewLabel')}
          data-tour="office-view-toggle"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {VIEWS.map(({ value, labelKey, Icon }) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => select(value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selected ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          );
        })}
        </div>
      </div>
      {active === '3d' ? <Office3DView /> : <OfficeView />}
    </div>
  );
}
