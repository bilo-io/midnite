'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { SUPPORTED_LOCALES, type Locale } from '@midnite/shared';

import { cn } from '@/lib/utils';
import { LocaleOptions } from '@/components/language-switcher';
import { LocaleFlag } from '@/components/locale-flag';

/** Ties the trigger's `aria-controls` to the portalled list. */
const LIST_ID = 'mobile-locale-options';

/**
 * The locale picker for the mobile `More` sheet, at the right end of the Settings
 * row — i.e. directly above the Lock button, so the sheet's right-hand column
 * reads language → lock, the desktop rail's footer order laid out vertically.
 *
 * Its own trigger rather than the rail's `<LanguageSwitcher>`: that one is a
 * left-aligned full-width row whose flyout anchors to the right of the icon rail,
 * with nowhere to go from the end of a row on a phone. The option list itself is
 * shared (`<LocaleOptions>`) so the two triggers can't drift apart.
 *
 * The list is portalled to the body with fixed positioning — the sheet is an
 * `overflow-y-auto` scroll container, so an in-flow drop-up would be clipped at
 * its edge — and anchored above the tab bar rather than to the trigger, so it
 * never lands off-screen from the right edge.
 */
export function LocalePicker({
  locale,
  onSelect,
}: {
  locale: Locale;
  onSelect: (locale: Locale) => void;
}) {
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const label = t('footer.language');
  const native =
    SUPPORTED_LOCALES.find((l) => l.code === locale)?.nativeLabel ?? locale;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={LIST_ID}
        aria-label={`${label}: ${native}`}
        // Shaped like the Lock button it sits above, so the two read as one column.
        className={cn(
          'flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
          open
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
        )}
      >
        <LocaleFlag locale={locale} className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </button>
      {open ? (
        <LocaleSheet
          locale={locale}
          label={label}
          onChoose={(next) => {
            onSelect(next);
            setOpen(false);
          }}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}

/** The portalled option list, floated above the mobile tab bar. */
function LocaleSheet({
  locale,
  label,
  onChoose,
  onClose,
}: {
  locale: Locale;
  label: string;
  onChoose: (locale: Locale) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      // Escape dismisses this list *and* the `More` sheet behind it: the sheet's
      // own handler is bound to `document` too, and `stopPropagation` can't stop a
      // sibling listener on the same node. Getting out of both on one Escape is
      // the reasonable reading of the key, so this doesn't fight it.
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <ul
      ref={ref}
      id={LIST_ID}
      role="listbox"
      aria-label={label}
      // Above the tab bar's 4rem (plus the home indicator) and above every layer
      // of the mobile chrome, which tops out at the bar's own z-40.
      className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[100] overflow-hidden rounded-lg border border-border bg-card p-1 shadow-lg"
    >
      <LocaleOptions locale={locale} onChoose={onChoose} />
    </ul>,
    document.body,
  );
}
