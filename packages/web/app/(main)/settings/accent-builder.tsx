'use client';

import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  ACCENT_GRADIENT_PRESETS,
  ACCENT_OPTIONS,
  ACCENT_SWATCH_HS,
  GRADIENT_TYPE_OPTIONS,
  isGradientAccent,
  type AccentId,
  type AccentValue,
  type GradientType,
} from '@/lib/app-settings';
import { accentGradientCss } from '@midnite/shell';
import { cn } from '@/lib/utils';

/** Deep-equality for accent values (both are constructed with stable key order). */
function sameAccent(a: AccentValue, b: AccentValue): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Track the resolved dark state so preview swatches use the right lightness ramp. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const read = () => setDark(html.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/** CSS background for any accent value — the gradient string, or a flat swatch. */
function accentBackground(value: AccentValue, isDark: boolean): string {
  if (isGradientAccent(value)) return accentGradientCss(value, isDark) ?? 'hsl(var(--primary))';
  if (value.swatch === 'default') return 'hsl(var(--muted))';
  const hs = ACCENT_SWATCH_HS[value.swatch];
  return `hsl(${hs.h} ${hs.s}% ${isDark ? 62 : 48}%)`;
}

const SWATCH_BTN =
  'flex h-7 w-7 items-center justify-center rounded-full border border-border/50 transition-transform hover:scale-110';

/** A row of the 8 palette swatches (+ optional Default) that sets one stop / channel. */
function SwatchRow({
  value,
  onPick,
  includeDefault,
  ariaLabel,
  isDark,
}: {
  value: AccentId;
  onPick: (id: AccentId) => void;
  includeDefault: boolean;
  ariaLabel: string;
  isDark: boolean;
}) {
  const options = includeDefault ? ACCENT_OPTIONS : ACCENT_OPTIONS.filter((o) => o.id !== 'default');
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.id;
        const isDefault = opt.id === 'default';
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => onPick(opt.id)}
            className={cn(SWATCH_BTN, isDefault && 'bg-muted', active && 'ring-2 ring-primary ring-offset-1 ring-offset-background')}
            style={isDefault ? undefined : { background: `hsl(${opt.h} ${opt.s}% ${isDark ? 62 : 48}%)` }}
          >
            {active ? <Check className={cn('h-3.5 w-3.5', isDefault ? 'text-foreground' : 'text-white')} /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Phase 68 accent builder: pick the brand gradient, a curated gradient preset,
 * or a solid — or build a custom gradient (linear/conic, mono/multi, 2–3 stops,
 * angle) — plus an independent secondary accent channel. Everything applies live.
 */
export function AccentBuilder({
  value,
  onChange,
  secondary,
  onSecondaryChange,
  hydrated,
}: {
  value: AccentValue;
  onChange: (next: AccentValue) => void;
  secondary: AccentValue;
  onSecondaryChange: (next: AccentValue) => void;
  hydrated: boolean;
}) {
  const t = useTranslations('settings');
  const isDark = useIsDark();
  const isGradient = isGradientAccent(value);
  const isCustom = isGradient && value.preset === 'custom';

  // The working gradient the custom controls edit — the current value if it's already
  // a custom gradient, else a sensible seed the user can tweak.
  const draft: Extract<AccentValue, { kind: 'gradient' }> = isCustom
    ? value
    : { kind: 'gradient', preset: 'custom', type: 'linear', stops: ['blue', 'violet'], angle: 90, animate: false };

  const isMono = draft.stops.length === 1;

  const setType = (type: GradientType) => onChange({ ...draft, type });
  const setAngle = (angle: number) => onChange({ ...draft, angle });
  const setStop = (i: number, id: AccentId) => {
    const stops = [...draft.stops];
    stops[i] = id;
    onChange({ ...draft, stops });
  };
  const setMono = (mono: boolean) => {
    if (mono) onChange({ ...draft, stops: [draft.stops[0] ?? 'blue'] });
    else onChange({ ...draft, stops: draft.stops.length >= 2 ? draft.stops : [draft.stops[0] ?? 'blue', 'violet'] });
  };
  const addStop = () => {
    if (draft.stops.length >= 3) return;
    onChange({ ...draft, stops: [...draft.stops, 'amber'] });
  };
  const removeStop = () => {
    if (draft.stops.length <= 2) return;
    onChange({ ...draft, stops: draft.stops.slice(0, -1) });
  };

  return (
    <div className={cn('space-y-5 transition-opacity', hydrated ? 'opacity-100' : 'opacity-0')}>
      {/* Live preview */}
      <div className="space-y-2">
        <div
          className="h-16 w-full rounded-lg border border-border/60"
          style={{ background: accentBackground(value, isDark) }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            style={{ background: accentBackground(value, isDark) }}
          >
            {t('appearance.accentBuilder.button')}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground"
            style={{ background: accentBackground(value, isDark) }}
          >
            {t('appearance.accentBuilder.badge')}
          </span>
          <span className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <span className="block h-full w-2/3" style={{ background: accentBackground(value, isDark) }} />
          </span>
          <span
            className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background"
            style={{ boxShadow: `0 0 0 2px hsl(var(--primary))` }}
          />
          {secondary.kind === 'solid' && secondary.swatch !== 'default' ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
              style={{ background: accentBackground(secondary, isDark) }}
              title={t('appearance.accentBuilder.secondaryAccent')}
            >
              {t('appearance.accentBuilder.secondaryShort')}
            </span>
          ) : null}
        </div>
        {isGradient ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={value.animate}
              onChange={(e) => onChange({ ...value, animate: e.target.checked })}
              className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
            />
            {t('appearance.accentBuilder.animateGradient')}
            <span className="text-[10px] opacity-70">{t('appearance.accentBuilder.respectsMotion')}</span>
          </label>
        ) : null}
      </div>

      {/* Gradient presets — brand first */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('appearance.accentBuilder.gradients')}</p>
        <div role="radiogroup" aria-label={t('appearance.accentBuilder.gradientPresets')} className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {ACCENT_GRADIENT_PRESETS.map((preset) => {
            const active = hydrated && sameAccent(value, preset.value);
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                title={preset.label}
                onClick={() => onChange(preset.value)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors',
                  active ? 'border-primary ring-1 ring-primary' : 'border-border/60 hover:border-foreground/20',
                )}
              >
                <span
                  className="flex h-7 w-full items-center justify-center rounded"
                  style={{ background: accentBackground(preset.value, isDark) }}
                >
                  {active ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Solid swatches */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{t('appearance.accentBuilder.solids')}</p>
        <SwatchRow
          value={value.kind === 'solid' ? value.swatch : ('__none__' as AccentId)}
          onPick={(id) => onChange({ kind: 'solid', swatch: id })}
          includeDefault
          ariaLabel={t('appearance.accentBuilder.solidAccent')}
          isDark={isDark}
        />
      </div>

      {/* Custom builder */}
      <div className="space-y-3 rounded-lg border border-border/60 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">{t('appearance.accentBuilder.customGradient')}</p>
          <button
            type="button"
            aria-pressed={isCustom}
            onClick={() => onChange(draft)}
            className={cn(
              'rounded px-2.5 py-1 text-xs font-medium transition-colors',
              isCustom ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
            )}
          >
            {isCustom ? t('appearance.accentBuilder.editing') : t('appearance.accentBuilder.customise')}
          </button>
        </div>

        {isCustom ? (
          <div className="space-y-4">
            {/* Type + mono/multi */}
            <div className="flex flex-wrap gap-4">
              <PillGroup
                label={t('appearance.accentBuilder.type')}
                value={draft.type}
                options={GRADIENT_TYPE_OPTIONS}
                onChange={(v) => setType(v as GradientType)}
              />
              <PillGroup
                label={t('appearance.accentBuilder.style')}
                value={isMono ? 'mono' : 'multi'}
                options={[
                  { value: 'mono', label: t('appearance.accentBuilder.mono') },
                  { value: 'multi', label: t('appearance.accentBuilder.multi') },
                ]}
                onChange={(v) => setMono(v === 'mono')}
              />
            </div>

            {/* Stops */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{isMono ? t('appearance.accentBuilder.colour') : t('appearance.accentBuilder.stops')}</p>
                {!isMono ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={removeStop}
                      disabled={draft.stops.length <= 2}
                      className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {t('appearance.accentBuilder.removeStop')}
                    </button>
                    <button
                      type="button"
                      onClick={addStop}
                      disabled={draft.stops.length >= 3}
                      className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      {t('appearance.accentBuilder.addStop')}
                    </button>
                  </div>
                ) : null}
              </div>
              {draft.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isMono ? t('appearance.accentBuilder.hue') : `#${i + 1}`}
                  </span>
                  <SwatchRow
                    value={stop}
                    onPick={(id) => setStop(i, id)}
                    includeDefault={false}
                    ariaLabel={t('appearance.accentBuilder.gradientStop', { number: i + 1 })}
                    isDark={isDark}
                  />
                </div>
              ))}
            </div>

            {/* Angle */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label htmlFor="accent-angle" className="text-xs font-medium text-muted-foreground">
                  {t('appearance.accentBuilder.angle')}
                </label>
                <span className="text-xs tabular-nums text-muted-foreground">{draft.angle}°</span>
              </div>
              <input
                id="accent-angle"
                type="range"
                min={0}
                max={360}
                step={5}
                value={draft.angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t('appearance.accentBuilder.customGradientDescription')}
          </p>
        )}
      </div>

      {/* Secondary accent */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t('appearance.accentBuilder.secondaryAccent')}</p>
          <p className="text-xs text-muted-foreground">
            {t('appearance.accentBuilder.secondaryAccentDescription')}
          </p>
        </div>
        <SwatchRow
          value={secondary.kind === 'solid' ? secondary.swatch : ('__none__' as AccentId)}
          onPick={(id) => onSecondaryChange({ kind: 'solid', swatch: id })}
          includeDefault
          ariaLabel={t('appearance.accentBuilder.secondaryAccent')}
          isDark={isDark}
        />
      </div>
    </div>
  );
}

/** A tiny labelled pill toggle group used inside the custom builder. */
function PillGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-md border border-border/60 bg-card/60 p-0.5">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
