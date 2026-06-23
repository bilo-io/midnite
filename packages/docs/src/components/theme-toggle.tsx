import { Tabs, type TabOption } from '@midnite/ui';
import { THEME_MODES, useTheme, type ThemeMode } from '@midnite/ui/theme';

const LABELS: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
  time: 'Time',
};

const OPTIONS: TabOption<ThemeMode>[] = THEME_MODES.map((mode) => ({ value: mode, label: LABELS[mode] }));

// The theme switcher — built from the library's own `Tabs` primitive + `useTheme`
// hook, so the docs site themes itself through the exact runtime it documents.
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <Tabs<ThemeMode>
      ariaLabel="Theme"
      options={OPTIONS}
      value={preference}
      onChange={setPreference}
      className="hidden sm:inline-flex"
    />
  );
}
