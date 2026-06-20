'use client';

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  Check,
  Clock,
  Laptop,
  LayoutGrid,
  Moon,
  PanelLeft,
  Palette,
  Sun,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Wordmark } from '@/components/wordmark';
import { useTheme, type ThemePreference } from '@/app/theme/theme-context';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  BACKGROUND_PATTERN_DEFAULT,
  BACKGROUND_PATTERN_OPTIONS,
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
  type BackgroundPattern,
  type NavMode,
} from '@/lib/app-settings';
import {
  DEFAULT_WORDMARK_FONT,
  WORDMARK_FONTS,
  WORDMARK_FONT_STORAGE_KEY,
} from '@/lib/wordmark-fonts';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
  { value: 'time', label: 'Time', Icon: Clock },
];

const NAV_MODE_OPTIONS: { value: NavMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Auto', hint: 'Collapsed; expands on hover' },
  { value: 'expanded', label: 'Locked open', hint: 'Always expanded' },
  { value: 'collapsed', label: 'Locked closed', hint: 'Always the icon bar' },
];

export function AppearanceSection() {
  const { preference, setPreference } = useTheme();
  const [settings, setSettings, hydrated] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );

  const navMode = settings.navMode ?? DEFAULT_SETTINGS.navMode;
  const setNavMode = (mode: NavMode) => setSettings((prev) => ({ ...prev, navMode: mode }));

  const backgroundPattern = settings.backgroundPattern ?? BACKGROUND_PATTERN_DEFAULT;
  const setBackgroundPattern = (pattern: BackgroundPattern) =>
    setSettings((prev) => ({ ...prev, backgroundPattern: pattern }));

  return (
    <div className="space-y-4">
      <Accordion title="Theme" icon={<Palette className="h-3.5 w-3.5" />} defaultOpen>
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
        </div>
      </Accordion>

      <Accordion title="Navigation" icon={<PanelLeft className="h-3.5 w-3.5" />} defaultOpen>
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
          <p className="text-xs text-muted-foreground/70">
            {NAV_MODE_OPTIONS.find((o) => o.value === navMode)?.hint}.
          </p>
        </div>
      </Accordion>

      <Accordion
        title="Background pattern"
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        defaultOpen
      >
        <div className="p-5">
          <SettingRow
            title="Backdrop"
            description="The decorative pattern behind the home screen, screensaver, and dashboard header."
          >
            <Segmented
              ariaLabel="Background pattern"
              value={backgroundPattern}
              onChange={setBackgroundPattern}
              options={BACKGROUND_PATTERN_OPTIONS}
              hydrated={hydrated}
            />
          </SettingRow>
        </div>
      </Accordion>

      <LogoCard />
    </div>
  );
}

/** Collapsible picker for the "midnite" wordmark font, applied app-wide live. */
function LogoCard() {
  const [font, setFont, hydrated] = useLocalStorage<string>(
    WORDMARK_FONT_STORAGE_KEY,
    DEFAULT_WORDMARK_FONT,
  );
  const [showIcon, setShowIcon] = useState(true);

  return (
    <Accordion title="Logo" icon={<Type className="h-3.5 w-3.5" />} defaultOpen>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/70">
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
                    Wordmark at its own per-font base size (no size override). */}
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
