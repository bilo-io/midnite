'use client';

import { Check, Clock, Laptop, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTheme, type ThemePreference } from '@/app/theme/theme-context';
import { cn } from '@/lib/utils';

import { HeaderIconButton } from './header-icon-button';
import { useHeaderDropdown } from './use-header-dropdown';

// Labels resolve from `nav.header.themeOptions.<value>` at render time.
const OPTIONS: { value: ThemePreference; Icon: typeof Sun }[] = [
  { value: 'light', Icon: Sun },
  { value: 'dark', Icon: Moon },
  { value: 'system', Icon: Laptop },
  { value: 'time', Icon: Clock },
];

/**
 * Header-actions theme picker — the "themes" control, moved out of the sidenav
 * footer into the top-right cluster (taking the slot the approvals shield used to
 * hold). The trigger shows the resolved-theme glyph (Sun/Moon); the panel is the
 * same set of preferences the sidenav toggle offered, opening downward with the
 * shared grow-in animation.
 */
export function ThemeMenu() {
  const t = useTranslations('nav');
  const { preference, resolved, setPreference } = useTheme();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();
  const TriggerIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <div ref={rootRef} className="group relative">
      <HeaderIconButton label={t('header.theme')} open={open} onClick={toggle}>
        <TriggerIcon className="h-[1.05rem] w-[1.05rem]" />
      </HeaderIconButton>
      {open ? (
        <div
          role="menu"
          aria-label={t('header.theme')}
          className="absolute right-0 top-full z-50 mt-2 w-44 origin-top-right animate-panel-in"
        >
          <div className="rounded-xl accent-gradient-border accent-gradient-border--lit">
            <div className="overflow-hidden rounded-xl bg-popover p-1 shadow-2xl">
              {OPTIONS.map(({ value, Icon }) => {
                const label = t(`header.themeOptions.${value}`);
                const active = preference === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      setPreference(value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      active && 'bg-accent text-accent-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                    {active ? <Check className="ml-auto h-4 w-4" /> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
