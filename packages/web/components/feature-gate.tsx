'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';
import { featureForPath, isFeatureEnabled } from '@/lib/features';
import { useFeatureLabels } from '@/lib/feature-labels';

/**
 * Watches the current route and, if it belongs to a feature the user has turned
 * off, blocks the page with a modal explaining which feature to enable. Rendered
 * once in the main layout so it covers every gated route. The settings hub isn't
 * a feature, so it's never gated — leaving a way back in to re-enable things.
 */
export function FeatureGate() {
  const t = useTranslations('common');
  const featureLabels = useFeatureLabels();
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
        router.push('/settings/features');
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [gated, router]);

  if (!gated || !feature) return null;

  // Label + description come from the catalog via the registry seam, so the dialog
  // reads in the user's language rather than mixing English registry copy into it.
  const { Icon } = feature;
  const label = featureLabels.label(feature);
  const description = featureLabels.description(feature);

  const enableFeature = () =>
    setSettings((prev) => ({
      ...prev,
      features: { ...prev.features, [feature.key]: true },
    }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
        onClick={() => router.push('/settings/features')}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t('chrome.featureGate.title', { feature: label })}
        className="animate-dialog-in relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {t('chrome.featureGate.title', { feature: label })}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('chrome.featureGate.body', { description })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push('/settings/features')}>
            {t('chrome.featureGate.openSettings')}
          </Button>
          <Button type="button" variant="default" size="sm" onClick={enableFeature}>
            {t('chrome.featureGate.enable', { feature: label })}
          </Button>
        </div>
      </div>
    </div>
  );
}
