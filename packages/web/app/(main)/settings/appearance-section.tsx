'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  Check,
  Clock,
  Cloud,
  CloudOff,
  Compass,
  Download,
  Globe,
  Laptop,
  LayoutGrid,
  Moon,
  PanelLeft,
  Paintbrush,
  Palette,
  RotateCcw,
  Sun,
  Type,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES, type Locale } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { PwaInstall } from '@/components/pwa-install';
import { StyledSelect } from '@/components/ui/styled-select';
import { Switch } from '@/components/ui/switch';
import { Wordmark } from '@/components/wordmark';
import { LocaleFlag } from '@/components/locale-flag';
import { setLocalePreference } from '@/lib/locale-preference';
import { AccentBuilder } from './accent-builder';
import { useTheme, type ThemePreference } from '@/app/theme/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  BACKGROUND_PATTERN_CLASS,
  BACKGROUND_PATTERN_DEFAULT,
  BACKGROUND_PATTERN_OPTIONS,
  BG_INTENSITY_DEFAULT,
  BG_INTENSITY_OPTIONS,
  ACCENT_DEFAULT,
  SECONDARY_ACCENT_OFF,
  DEFAULT_EFFECTS,
  DEFAULT_SETTINGS,
  DENSITY_DEFAULT,
  DENSITY_OPTIONS,
  EFFECT_OPTIONS,
  MOTION_DEFAULT,
  MOTION_OPTIONS,
  SETTINGS_STORAGE_KEY,
  SHIMMER_DIRECTION_DEFAULT,
  SHIMMER_DIRECTION_OPTIONS,
  UI_FONT_DEFAULT,
  UI_FONT_OPTIONS,
  type AccentValue,
  type AppSettings,
  type BackgroundPattern,
  type BgIntensity,
  type Density,
  type Motion,
  type NavMode,
  type ShimmerDirection,
  type UiFont,
  type VisualEffects,
} from '@/lib/app-settings';
import {
  applyAccent,
  applyAccentSecondary,
  applyDensity,
  applyEffects,
  applyMotion,
  applyShimmerDirection,
  applyUiFont,
  coerceAccentValue,
} from '@midnite/shell';
import {
  DEFAULT_WORDMARK_CASE,
  WORDMARK_CASE_OPTIONS,
  WORDMARK_CASE_STORAGE_KEY,
  WORDMARK_FONTS,
  WORDMARK_FONT_STORAGE_KEY,
  WORDMARK_LOGO_FONT,
  type WordmarkCase,
} from '@/lib/wordmark-fonts';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
  { value: 'time', label: 'Time', Icon: Clock },
];

const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((l) => ({
  value: l.code,
  label: `${l.nativeLabel} (${l.code})`,
  icon: <LocaleFlag locale={l.code} className="h-4 w-4" />,
}));

const NAV_MODE_OPTIONS: { value: NavMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Collapsed; expands on hover' },
  { value: 'expanded', label: 'Locked open', hint: 'Always expanded' },
  { value: 'collapsed', label: 'Locked closed', hint: 'Always the icon bar' },
];

export function AppearanceSection() {
  const { preference, setPreference } = useTheme();
  const { user, jwtEnabled } = useAuth();
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const navMode = settings.navMode ?? DEFAULT_SETTINGS.navMode;
  const setNavMode = (mode: NavMode) => setSettings((prev) => ({ ...prev, navMode: mode }));

  // Active locale (resolved by the shell provider); one write path via setSettings.
  const locale = useLocale() as Locale;
  const t = useTranslations('settings');

  const backgroundPattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const setBackgroundPattern = (pattern: BackgroundPattern) =>
    setSettings((prev) => ({ ...prev, backgroundPattern: pattern }));

  const bgIntensity = settings.bgIntensity ?? BG_INTENSITY_DEFAULT;
  const setBgIntensity = (intensity: BgIntensity) =>
    setSettings((prev) => ({ ...prev, bgIntensity: intensity }));

  const bgDynamic = settings.bgDynamic ?? DEFAULT_SETTINGS.bgDynamic;
  const setBgDynamic = (value: boolean) => setSettings((prev) => ({ ...prev, bgDynamic: value }));

  // Coerce on read: pre-Phase-68 blobs stored a bare swatch string (see apply-appearance.ts)
  const accent = coerceAccentValue(settings.accent, ACCENT_DEFAULT);
  const setAccent = (next: AccentValue) => setSettings((prev) => ({ ...prev, accent: next }));

  const accentSecondary = coerceAccentValue(settings.accentSecondary, SECONDARY_ACCENT_OFF);
  const setAccentSecondary = (next: AccentValue) =>
    setSettings((prev) => ({ ...prev, accentSecondary: next }));

  const motion = settings.motion ?? MOTION_DEFAULT;
  const setMotion = (next: Motion) => setSettings((prev) => ({ ...prev, motion: next }));

  const autoShowGuides = settings.autoShowGuides ?? DEFAULT_SETTINGS.autoShowGuides;
  const setAutoShowGuides = (value: boolean) =>
    setSettings((prev) => ({ ...prev, autoShowGuides: value }));

  const density = settings.density ?? DENSITY_DEFAULT;
  const setDensity = (next: Density) => setSettings((prev) => ({ ...prev, density: next }));

  const uiFont = settings.uiFont ?? UI_FONT_DEFAULT;
  const setUiFont = (next: UiFont) => setSettings((prev) => ({ ...prev, uiFont: next }));

  const effects = { ...DEFAULT_EFFECTS, ...(settings.effects ?? {}) };
  const setEffect = (key: keyof VisualEffects, value: boolean) =>
    setSettings((prev) => ({ ...prev, effects: { ...DEFAULT_EFFECTS, ...prev.effects, [key]: value } }));

  const shimmerDirection = settings.shimmerDirection ?? SHIMMER_DIRECTION_DEFAULT;
  const setShimmerDirection = (next: ShimmerDirection) =>
    setSettings((prev) => ({ ...prev, shimmerDirection: next }));

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setPreference('system');
    applyAccent(DEFAULT_SETTINGS.accent);
    applyAccentSecondary(DEFAULT_SETTINGS.accentSecondary);
    applyMotion(DEFAULT_SETTINGS.motion);
    applyDensity(DEFAULT_SETTINGS.density);
    applyUiFont(DEFAULT_SETTINGS.uiFont);
    applyEffects(DEFAULT_SETTINGS.effects);
    applyShimmerDirection(DEFAULT_SETTINGS.shimmerDirection);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {/* Sync status (Phase 43): only meaningful when accounts are enabled. */}
        {jwtEnabled ? (
          user ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Cloud className="h-3 w-3" />
              {t('syncedToAccount')}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CloudOff className="h-3 w-3" />
              {t('signInToSync')}
            </span>
          )
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          {t('reset')}
        </button>
      </div>

      <Accordion title={t('appearance.language')} icon={<Globe className="h-3.5 w-3.5" />} defaultOpen>
        <div className="p-5">
          <SettingRow
            title={t('appearance.language')}
            description={t('appearance.languageDescription')}
          >
            <StyledSelect<Locale>
              options={LOCALE_OPTIONS}
              value={locale}
              onChange={(next) => setLocalePreference(setSettings, next)}
              aria-label="Language"
              className="w-56"
            />
          </SettingRow>
        </div>
      </Accordion>

      <Accordion title={t('appearance.theme')} icon={<Palette className="h-3.5 w-3.5" />} defaultOpen>
        <div className="p-5">
          <SettingRow
            title="Colour theme"
            description="Light, dark, follow your system, or switch automatically by time of day."
          >
            <Segmented
              ariaLabel="Colour theme"
              value={preference}
              onChange={setPreference}
              options={THEME_OPTIONS}
              hydrated={hydrated}
            />
          </SettingRow>
          <div className="mt-4 border-t border-border/60 pt-4">
            <SettingRow
              title="Interface font"
              description="The font used for body text across the app. System fonts only — no download, applies instantly. Code, terminals, and the wordmark keep their own type."
            >
              <Segmented
                ariaLabel="Interface font"
                value={uiFont}
                onChange={setUiFont}
                options={UI_FONT_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))}
                hydrated={hydrated}
              />
            </SettingRow>
            <p
              className="mt-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
              style={{ fontFamily: 'var(--font-ui, inherit)' }}
            >
              The quick brown fox jumps over the lazy dog — 0123456789
            </p>
          </div>
        </div>
      </Accordion>

      <Accordion title={t('appearance.navigation')} icon={<PanelLeft className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-4 p-5">
          <SettingRow
            title="Side navigation"
            description="Lock the nav open or closed, or let it stay collapsed and expand on hover."
          >
            <Segmented
              ariaLabel="Side navigation"
              value={navMode}
              onChange={setNavMode}
              options={NAV_MODE_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))}
              hydrated={hydrated}
            />
          </SettingRow>
          <p className="text-xs text-muted-foreground">
            {NAV_MODE_OPTIONS.find((o) => o.value === navMode)?.hint}.
          </p>
        </div>
      </Accordion>

      <Accordion
        title="Background pattern"
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div className="space-y-4 p-5">
          <p className="text-xs text-muted-foreground">
            The decorative backdrop drawn behind every page — plus the dashboard header, the
            landing screen, and the screensaver. The starfield adapts to your theme and accent.
          </p>
          <div
            role="radiogroup"
            aria-label="Background pattern"
            className={cn(
              'grid grid-cols-3 gap-2 sm:grid-cols-4 transition-opacity',
              hydrated ? 'opacity-100' : 'opacity-0',
            )}
          >
            {BACKGROUND_PATTERN_OPTIONS.map((opt) => {
              const active = hydrated && backgroundPattern === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBackgroundPattern(opt.value)}
                  className={cn(
                    'relative flex h-16 items-end justify-start overflow-hidden rounded-lg border p-2 text-left transition-colors',
                    active
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-border/60 hover:border-foreground/20',
                  )}
                >
                  {/* Live pattern preview — no mask-image so it fills the swatch */}
                  <div
                    className={cn('pointer-events-none absolute inset-0', BACKGROUND_PATTERN_CLASS[opt.value])}
                    style={{ maskImage: 'none', WebkitMaskImage: 'none' }}
                  />
                  <span
                    className={cn(
                      'relative z-10 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                      active ? 'bg-primary text-primary-foreground' : 'bg-background/70 text-foreground/80',
                    )}
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border/60 pt-4">
            <label className="flex items-center justify-between gap-4">
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Dynamic motion</span>
                <span className="block text-xs text-muted-foreground">
                  Subtly animate the pattern and let it react to your cursor — the starfield
                  swirls and fires, dots scatter, rulers track, gradients drift like clouds.
                </span>
              </span>
              <Switch
                checked={hydrated && bgDynamic}
                onCheckedChange={setBgDynamic}
                aria-label="Dynamic motion"
              />
            </label>
            {bgDynamic && motion === 'reduced' && (
              <p className="mt-2 text-xs text-muted-foreground">
                Your Motion setting is &ldquo;Reduced&rdquo;, so the static pattern is shown
                instead until motion is allowed again.
              </p>
            )}
          </div>

          {/* Intensity control — only visible when the animated gradient is selected */}
          {backgroundPattern === 'gradient' && (
            <SettingRow
              title="Intensity"
              description="How visible the animated gradient backdrop is."
            >
              <Segmented
                ariaLabel="Gradient intensity"
                value={bgIntensity}
                onChange={setBgIntensity}
                options={BG_INTENSITY_OPTIONS}
                hydrated={hydrated}
              />
            </SettingRow>
          )}
        </div>
      </Accordion>

      <Accordion title={t('appearance.accent')} icon={<Paintbrush className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-4 p-5">
          <p className="text-xs text-muted-foreground">
            Retints buttons, links, and focus rings across the app. Pick the brand gradient, a
            gradient preset, or a solid — or build your own. Adapts to light and dark.
          </p>
          <AccentBuilder
            value={accent}
            onChange={setAccent}
            secondary={accentSecondary}
            onSecondaryChange={setAccentSecondary}
            hydrated={hydrated}
          />
        </div>
      </Accordion>

      <Accordion title={t('appearance.motionEffects')} icon={<Zap className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-4 p-5">
          <SettingRow
            title="Density"
            description="Comfortable uses the default spacing; compact fits more on screen."
          >
            <Segmented
              ariaLabel="Density"
              value={density}
              onChange={setDensity}
              options={DENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))}
              hydrated={hydrated}
            />
          </SettingRow>
          <p className="text-xs text-muted-foreground">
            {DENSITY_OPTIONS.find((o) => o.value === density)?.hint}.
          </p>
          <div className="border-t border-border/60 pt-4">
            <SettingRow
              title="Motion"
              description="Follow your system's reduced-motion setting, minimise animation, or always animate."
            >
              <Segmented
                ariaLabel="Motion"
                value={motion}
                onChange={setMotion}
                options={MOTION_OPTIONS.map((o) => ({ value: o.value, label: o.label, title: o.hint }))}
                hydrated={hydrated}
              />
            </SettingRow>
            <p className="mt-4 text-xs text-muted-foreground">
              {MOTION_OPTIONS.find((o) => o.value === motion)?.hint}.
            </p>
          </div>
          <div className="space-y-3 border-t border-border/60 pt-4">
            {EFFECT_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-center justify-between gap-4"
                title={opt.hint}
              >
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">{opt.label}</span>
                  <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                </span>
                <Switch
                  checked={effects[opt.key]}
                  onCheckedChange={(v: boolean) => setEffect(opt.key, v)}
                  aria-label={opt.label}
                />
              </label>
            ))}
          </div>
          <div className="border-t border-border/60 pt-4">
            <SettingRow
              title="Shimmer cascade"
              description="Which way the live status-pill shimmer sweeps across the home screen and screensaver."
            >
              <Segmented
                ariaLabel="Shimmer cascade direction"
                value={shimmerDirection}
                onChange={setShimmerDirection}
                options={SHIMMER_DIRECTION_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                  title: o.hint,
                }))}
                hydrated={hydrated}
              />
            </SettingRow>
            <p className="mt-4 text-xs text-muted-foreground">
              {SHIMMER_DIRECTION_OPTIONS.find((o) => o.value === shimmerDirection)?.hint}.
            </p>
          </div>
        </div>
      </Accordion>

      <Accordion title="Product guides" icon={<Compass className="h-3.5 w-3.5" />}>
        <div className="p-5">
          <label className="flex items-center justify-between gap-4" title="Auto-show guides">
            <span className="space-y-0.5">
              <span className="block text-sm font-medium">Auto-show guides</span>
              <span className="block text-xs text-muted-foreground">
                Show a page&apos;s product guide once, the first time you visit it. Turn this off to keep
                guides available only on demand from the assistant menu.
              </span>
            </span>
            <Switch
              checked={autoShowGuides}
              onCheckedChange={setAutoShowGuides}
              aria-label="Auto-show guides"
            />
          </label>
        </div>
      </Accordion>

      <Accordion title="Install app" icon={<Download className="h-3.5 w-3.5" />} defaultOpen>
        <div className="p-5">
          <PwaInstall />
        </div>
      </Accordion>

      <LogoCard />
    </div>
  );
}

/**
 * Collapsible trial picker for the "midnite" wordmark — its font and its
 * letter-casing, applied app-wide live. Both persist in their own localStorage
 * keys (not synced), so the sidenav and every other wordmark update the moment a
 * card or casing is chosen. Picking a casing re-renders the whole font grid in
 * that casing, so each face can be judged in the chosen form.
 */
function LogoCard() {
  const [font, setFont, hydrated] = useLocalStorage<string>(
    WORDMARK_FONT_STORAGE_KEY,
    WORDMARK_LOGO_FONT,
  );
  const [wordmarkCase, setWordmarkCase] = useLocalStorage<WordmarkCase>(
    WORDMARK_CASE_STORAGE_KEY,
    DEFAULT_WORDMARK_CASE,
  );
  const [showIcon, setShowIcon] = useState(true);

  return (
    <Accordion title="Logo" icon={<Type className="h-3.5 w-3.5" />} defaultOpen>
      <div className="space-y-4 p-5">
        <SettingRow
          title="Capitalisation"
          description="How the wordmark is cased everywhere it renders. Trial each form against the font below."
        >
          <Segmented
            ariaLabel="Wordmark capitalisation"
            value={wordmarkCase}
            onChange={setWordmarkCase}
            options={WORDMARK_CASE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            hydrated={hydrated}
          />
        </SettingRow>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            The font the midnite wordmark is set in across the app.
          </p>
          <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span>Show icon</span>
            <Switch checked={showIcon} onCheckedChange={setShowIcon} aria-label="Show icon" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WORDMARK_FONTS.map((f) => {
            const selected = hydrated && font === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFont(f.key)}
                aria-pressed={selected}
                className={cn(
                  'group relative flex min-h-[120px] min-w-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border bg-card p-5 text-card-foreground transition-colors',
                  selected
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border/60 hover:border-foreground/20 hover:bg-accent/30',
                )}
              >
                {selected ? (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary-foreground">
                    <Check className="h-3 w-3" />
                    Active
                  </span>
                ) : null}

                {/* Mirror the sidenav exactly: h-8 w-8 logo, gap-2, and the
                    Wordmark at its own per-font base size (no size override).
                    Pinning `font` previews this face; casing follows the stored
                    selection above so the whole grid tracks the toggle. */}
                <div className="flex items-center gap-2 overflow-hidden">
                  {showIcon ? (
                    <Image
                      src="/logo.PNG"
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                    />
                  ) : null}
                  <Wordmark font={f.key} />
                </div>

                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Accordion>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

/** A segmented radio group, mirroring the nav-mode control in the old settings view. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  hydrated,
}: {
  value: T;
  options: { value: T; label: string; Icon?: LucideIcon; title?: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  hydrated: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'flex shrink-0 flex-wrap gap-0.5 self-start rounded-md border border-border/60 bg-card/60 p-0.5 transition-opacity',
        hydrated ? 'opacity-100' : 'opacity-0',
      )}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.Icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            title={opt.title}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
