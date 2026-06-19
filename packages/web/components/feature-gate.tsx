'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { featureForPath, isFeatureEnabled } from '@/lib/features';

/**
 * Watches the current route and, if it belongs to a feature the user has turned
 * off, blocks the page with a modal explaining which feature to enable. Rendered
 * once in the main layout so it covers every gated route. The settings hub isn't
 * a feature, so it's never gated — leaving a way back in to re-enable things.
 */
export function FeatureGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const feature = featureForPath(pathname);
  const gated = hydrated && feature !== null && !isFeatureEnabled(settings.features, feature.key);

  // Escape sends the user to settings rather than leaving them stuck behind the
  // modal on a page they can't view.
  useEffect(() => {
    if (!gated) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        router.push('/settings/system');
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [gated, router]);

  if (!gated || !feature) return null;

  const { Icon, label, description } = feature;

  const enableFeature = () =>
    setSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [feature.key]: true },
    }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
        onClick={() => router.push('/settings/system')}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={`${label} is disabled`}
        className="animate-dialog-in relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {label} is disabled
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description} This feature is currently turned off — enable it to view this page.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/settings/system')}>
            Open settings
          </Button>
          <Button type="button" variant="default" size="sm" onClick={enableFeature}>
            Enable {label}
          </Button>
        </div>
      </div>
    </div>
  );
}
