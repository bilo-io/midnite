'use client';

import { Check, Clock, Laptop, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemePreference } from '@/app/theme/theme-context';
import { cn } from '@/lib/utils';

import { HeaderIconButton } from './header-icon-button';
import { useHeaderDropdown } from './use-header-dropdown';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Laptop },
  { value: 'time', label: 'Time', Icon: Clock },
];

/**
 * Header-actions theme picker — the "themes" control, moved out of the sidenav
 * footer into the top-right cluster (taking the slot the approvals shield used to
 * hold). The trigger shows the resolved-theme glyph (Sun/Moon); the panel is the
 * same set of preferences the sidenav toggle offered, opening downward with the
 * shared grow-in animation.
 */
export function ThemeMenu() {
  const { preference, resolved, setPreference } = useTheme();
  const { open, toggle, setOpen, rootRef } = useHeaderDropdown();
  const TriggerIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <div ref={rootRef} className="group relative">
      <HeaderIconButton label="Theme" open={open} onClick={toggle}>
        <TriggerIcon className="h-[1.05rem] w-[1.05rem]" />
      </HeaderIconButton>
      {open ? (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 top-full z-50 mt-2 w-44 origin-top-right animate-panel-in overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-2xl"
        >
          {OPTIONS.map(({ value, label, Icon }) => {
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
      ) : null}
    </div>
  );
}
