'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { SUPPORTED_LOCALES, type Locale } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { LocaleFlag } from '@/components/locale-flag';

type LanguageSwitcherProps = {
  /** Rail state — collapsed shows the flag only; expanded shows the label. */
  expanded: boolean;
  /** The active locale (drives the flag + label + selected row). */
  locale: Locale;
  onSelect: (locale: Locale) => void;
};

const localeInfo = (code: Locale) =>
  SUPPORTED_LOCALES.find((l) => l.code === code) ?? { code, label: code, nativeLabel: code };

/** `Deutsch (de-DE)` — native label + code in brackets (user request). */
const localeLabel = (code: Locale) => `${localeInfo(code).nativeLabel} (${code})`;

/**
 * The sidenav-footer language switcher (Phase 79 Theme C) — sits just above
 * Settings, mirroring where the theme switcher used to live. Collapsed = a round
 * flag icon; expanded = the current language + locale code. Opens a portalled
 * popover (per the rail-overflow convention) to pick from `SUPPORTED_LOCALES`;
 * selection routes through the caller's one write path.
 */
export function LanguageSwitcher({ expanded, locale, onSelect }: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null);

  const toggle = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ left: rect.right + 8, bottom: window.innerHeight - rect.bottom });
    setOpen((v) => !v);
  };

  const choose = (code: Locale) => {
    onSelect(code);
    setOpen(false);
  };

  return (
    <div className="group relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Language: ${localeInfo(locale).label}`}
        className={cn(
          'flex h-9 items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
          expanded ? 'w-full gap-3 px-2.5' : 'w-9 justify-center',
          open && 'bg-accent/60 text-foreground',
        )}
      >
        <LocaleFlag locale={locale} className="h-5 w-5" />
        {expanded ? (
          <span className="truncate text-sm">{localeLabel(locale)}</span>
        ) : (
          <RailTooltip>{localeLabel(locale)}</RailTooltip>
        )}
      </button>

      {open ? (
        <LanguagePopover locale={locale} anchor={anchor} onChoose={choose} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

function LanguagePopover({
  locale,
  anchor,
  onChoose,
  onClose,
}: {
  locale: Locale;
  anchor: { left: number; bottom: number } | null;
  onChoose: (locale: Locale) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <ul
      ref={ref}
      role="listbox"
      aria-label="Select language"
      className="fixed z-[100] min-w-52 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg"
      style={{ left: anchor?.left ?? 0, bottom: anchor?.bottom ?? 0 }}
    >
      {SUPPORTED_LOCALES.map((l) => {
        const active = l.code === locale;
        return (
          <li key={l.code}>
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onChoose(l.code)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left text-sm transition-colors',
                active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/60',
              )}
            >
              <LocaleFlag locale={l.code} className="h-5 w-5" />
              <span className="flex-1 truncate">{l.nativeLabel}</span>
              <span className="text-xs text-muted-foreground">{l.code}</span>
              {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
            </button>
          </li>
        );
      })}
    </ul>,
    document.body,
  );
}

/** Hover/focus tooltip for the collapsed icon rail (mirrors app-shell-client's). */
function RailTooltip({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/80 bg-card px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}
