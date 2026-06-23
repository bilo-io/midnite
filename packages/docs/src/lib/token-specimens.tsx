import { cn, color, radius } from '@midnite/ui';

// Live foundations specimens — driven by the real exported tokens (@midnite/ui's
// typed token map), so these pages can't drift from the system. Swatches paint
// with `hsl(var(--token))`, which flips with the active theme, while the listed
// HSL triplets are the canonical light/dark values from the token source.

const kebab = (key: string) => key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

const COLOR_TOKENS = Object.keys(color.light) as (keyof typeof color.light)[];

export function ColorPalette() {
  return (
    <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {COLOR_TOKENS.map((name) => (
        <div key={name} className="overflow-hidden rounded-lg border border-border">
          <div className="h-16 w-full" style={{ backgroundColor: `hsl(var(--${kebab(name)}))` }} />
          <div className="space-y-1 bg-card p-2.5">
            <div className="font-mono text-xs font-medium text-foreground">{name}</div>
            <div className="font-mono text-[0.65rem] text-muted-foreground">light · {color.light[name]}</div>
            <div className="font-mono text-[0.65rem] text-muted-foreground">dark · {color.dark[name]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const RADII = ['sm', 'md', 'lg'] as const;

export function RadiusScale() {
  return (
    <div className="my-6 flex flex-wrap gap-6">
      {RADII.map((key) => (
        <div key={key} className="flex flex-col items-center gap-2">
          <div
            className="h-16 w-16 border border-border bg-accent"
            style={{ borderRadius: radius[key] }}
          />
          <div className="font-mono text-xs text-muted-foreground">
            {key} · {radius[key]}
          </div>
        </div>
      ))}
    </div>
  );
}

// Typography is a documented placeholder in the token map today (the app uses
// Tailwind's default type scale); these specimens show that scale until the DS
// formalises its own.
const TYPE_SCALE = [
  { cls: 'text-xs', label: 'xs · 0.75rem' },
  { cls: 'text-sm', label: 'sm · 0.875rem' },
  { cls: 'text-base', label: 'base · 1rem' },
  { cls: 'text-lg', label: 'lg · 1.125rem' },
  { cls: 'text-xl', label: 'xl · 1.25rem' },
  { cls: 'text-2xl', label: '2xl · 1.5rem' },
  { cls: 'text-3xl', label: '3xl · 1.875rem' },
];

export function TypeScale() {
  return (
    <div className="my-6 space-y-3">
      {TYPE_SCALE.map((size) => (
        <div key={size.cls} className="flex items-baseline gap-4 border-b border-border pb-3">
          <span className={cn(size.cls, 'font-medium text-foreground')}>The quick brown fox</span>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">{size.label}</span>
        </div>
      ))}
    </div>
  );
}
