'use client';

import { Blocks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { FEATURES, groupNavSections, isFeatureEnabled, type Feature, type FeatureKey } from '@/lib/features';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type AppSettings } from '@/lib/app-settings';

export function FeaturesSection() {
  const t = useTranslations('settings');
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const setFeatureEnabled = (key: FeatureKey, on: boolean) =>
    setSettings((prev) => ({ ...prev, features: { ...prev.features, [key]: on } }));

  // Grouped exactly like the side nav: dashboard pinned, then the App / Agents /
  // Overview sections — so what you toggle here maps 1:1 to what you see there.
  const { pinned, sections } = groupNavSections(FEATURES);

  const renderFeatureRow = (f: Feature, withDivider: boolean) => {
    const Icon = f.Icon;
    return (
      <div
        key={f.key}
        className={`flex items-start justify-between gap-6 py-3${withDivider ? ' border-t border-border/50' : ''}`}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card/60 text-muted-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{f.label}</p>
            <p className="text-xs text-muted-foreground">{f.description}</p>
          </div>
        </div>
        <Switch
          checked={isFeatureEnabled(settings.features, f.key)}
          onCheckedChange={(on) => setFeatureEnabled(f.key, on)}
          aria-label={t('features.enableAria', { feature: f.label })}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Accordion
        title={t('features.title')}
        icon={<Blocks className="h-3.5 w-3.5" />}
        count={FEATURES.length}
        defaultOpen
      >
        <div className="p-5">
          <p className="pb-2 text-xs text-muted-foreground">{t('features.description')}</p>
          <div>
            {pinned.map((f, i) => renderFeatureRow(f, i > 0))}
            {sections.map((section) => (
              <div key={section.key}>
                <h3 className="border-t border-muted-foreground/30 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </h3>
                {section.features.map((f, i) => renderFeatureRow(f, i > 0))}
              </div>
            ))}
          </div>
        </div>
      </Accordion>
    </div>
  );
}
