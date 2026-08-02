import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  // Scans this app's source AND `@midnite/ui`'s, so every utility a shared
  // primitive references is generated in the site's CSS. Before Phase 80 the site
  // only used icon-shaped primitives and got away without it; the moment it mounted
  // `ReadingLayout`, the lib's own grid/visibility utilities (`md:grid`,
  // `xl:block`, …) existed nowhere in this app's source and so were never emitted —
  // the reading columns silently collapsed to a single stacked flex column.
  // Scanning the lib's source for CLASS NAMES is a CSS-generation concern, not a
  // code import, so the boundary rules are unaffected (docs does the same).
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        brand: ['var(--font-brand)', 'sans-serif'],
        cassandra: ['var(--font-cassandra)', 'var(--font-brand)', 'sans-serif'],
      },
    },
  },
};

export default config;
