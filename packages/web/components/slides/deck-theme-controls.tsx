'use client';

import type { DeckTheme } from '@midnite/shared';
import { Button } from '@/components/ui/button';

type Channel = keyof DeckTheme;
const CHANNELS: Array<{ key: Channel; label: string; placeholder: string }> = [
  { key: 'background', label: 'Background', placeholder: 'inherited' },
  { key: 'foreground', label: 'Foreground', placeholder: 'inherited' },
  { key: 'accent', label: 'Accent', placeholder: 'inherited' },
];

type Props = {
  theme?: DeckTheme;
  onChange: (theme: DeckTheme | undefined) => void;
};

/**
 * Per-deck theme override: HSL triplets (e.g. "222 47% 11%") layered over the app's
 * inherited theme vars. Empty channels fall back to the inherited value; clearing
 * every channel removes the override entirely (deck follows the app theme).
 */
export function DeckThemeControls({ theme, onChange }: Props) {
  const setChannel = (key: Channel, value: string) => {
    const next: DeckTheme = { ...theme };
    if (value.trim()) next[key] = value.trim();
    else delete next[key];
    onChange(Object.keys(next).length === 0 ? undefined : next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Theme override
        </span>
        {theme ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            className="h-6 px-2 text-xs"
          >
            Reset
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2">
        {CHANNELS.map(({ key, label, placeholder }) => {
          const value = theme?.[key] ?? '';
          return (
            <label key={key} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 rounded border border-border/60"
                style={value ? { background: `hsl(${value})` } : undefined}
              />
              <input
                type="text"
                inputMode="text"
                aria-label={`${label} HSL triplet`}
                value={value}
                placeholder={placeholder}
                onChange={(e) => setChannel(key, e.target.value)}
                className="min-w-0 flex-1 rounded border border-border/60 bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary/60"
              />
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        HSL triplet, e.g. <code className="font-mono">222 47% 11%</code>. Leave blank to inherit.
      </p>
    </div>
  );
}
