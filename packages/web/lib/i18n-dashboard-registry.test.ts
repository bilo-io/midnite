import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { ACTIVITY_KINDS, activityKindKey } from '@/lib/activity-kind-labels';
import { ALL_WIDGET_TYPES, WIDGET_CATEGORIES } from '@/lib/dashboard-widgets';
import { GREETING_WINDOWS, SUBGREETINGS } from '@/lib/landing-greetings';

/**
 * Phase 82 Theme D (dashboard round 2) — static guard for the widget fleet, mirroring
 * `i18n-chrome-registry.test.ts`.
 *
 * Four registries feed this slice's copy, and each one's fallback is a safety net rather
 * than a habit only if something fails when the catalog falls behind:
 *
 * 1. **`DASHBOARD_WIDGETS`** — `useWidgetLabels()` resolves `dashboard.catalog.<type>.*`
 *    and the card *headers* now read the same keys as the Add-widget picker, so a missing
 *    entry would show a raw path in two places at once.
 * 2. **`WIDGET_CATEGORIES`** — the picker's section headers.
 * 3. **`ACTIVITY_KINDS`** — the allowlist of gateway event kinds the feed can name.
 *    `TaskActivityEntry.kind` is an open `z.string()`, so this sweep is what keeps the
 *    *known* set honest while `humanizeKind()` covers the rest.
 * 4. **The landing greetings** — 11 time-of-day windows and a 50-phrase rotating pool,
 *    indexed by array position. Adding a phrase to `SUBGREETINGS` fails here until both
 *    catalogs have it, which is the only thing stopping the index/key mapping drifting.
 *
 * Plus the usual per-file `t()` key resolution for every migrated file in the slice.
 */

/** Resolve a dotted key against the nested catalog; true if it lands on a string. */
function keyExists(catalog: Record<string, unknown>, dotted: string): boolean {
  let node: unknown = catalog;
  for (const part of dotted.split('.')) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return false;
    }
  }
  return typeof node === 'string';
}

const ROOT = join(__dirname, '..');

/** Every file the slice migrated that references catalog keys by literal. */
const FILES = [
  'app/(main)/dashboard/page.tsx',
  'app/(main)/page.tsx',
  'components/activity-widget.tsx',
  'components/agents-widget.tsx',
  'components/cost-by-repo-widget.tsx',
  'components/cycle-time-widget.tsx',
  'components/dashboard-grid.tsx',
  'components/dashboard-tabs.tsx',
  'components/dashboard-tiles.tsx',
  'components/dashboard-timeframe.tsx',
  'components/disk-widget.tsx',
  'components/fleet-trend-widget.tsx',
  'components/health-widget.tsx',
  'components/landing-clock.tsx',
  'components/landing-weather.tsx',
  'components/links-widget.tsx',
  'components/memories-widget.tsx',
  'components/news-widget.tsx',
  'components/quick-capture-widget.tsx',
  'components/quote-widget.tsx',
  'components/repo-status-widget.tsx',
  'components/scratchpad-widget.tsx',
  'components/shipped-widget.tsx',
  'components/storage-widget.tsx',
  'components/system-monitor-widget.tsx',
  'components/throughput-widget.tsx',
  'components/usage-widget.tsx',
  'components/weather-widget.tsx',
  'lib/use-unit-format.ts',
];

const CATALOGS: Array<[string, Record<string, unknown>]> = [
  ['en-GB', enGB as Record<string, unknown>],
  ['fr-FR', frFR as Record<string, unknown>],
];

// `const <name> = useTranslations('ns')` → the namespace that translator binds to.
const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

describe('Phase 82 D — dashboard round-2 i18n keys resolve in en-GB and fr-FR', () => {
  for (const rel of FILES) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const binds = [...src.matchAll(BIND_RE)].map((m) => ({ name: m[1], ns: m[2] }));

    it(`binds a translator in ${rel}`, () => {
      expect(binds.length).toBeGreaterThan(0);
    });

    for (const [localeName, catalog] of CATALOGS) {
      it(`resolves every t() key referenced in ${rel} (${localeName})`, () => {
        const missing: string[] = [];
        for (const { name, ns } of binds) {
          const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.]*)['"]`, 'g');
          for (const m of src.matchAll(callRe)) {
            if (!keyExists(catalog, `${ns}.${m[1]}`)) missing.push(`${ns}.${m[1]}`);
          }
        }
        expect(missing, `unresolved ${localeName} keys in ${rel}`).toEqual([]);
      });
    }
  }

  it('covers every widget type with a catalog label AND description', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const type of ALL_WIDGET_TYPES) {
        if (!keyExists(catalog, `dashboard.catalog.${type}.label`)) {
          missing.push(`dashboard.catalog.${type}.label`);
        }
        if (!keyExists(catalog, `dashboard.catalog.${type}.description`)) {
          missing.push(`dashboard.catalog.${type}.description`);
        }
      }
      expect(missing, `${localeName} widget catalog copy`).toEqual([]);
    }
  });

  it('covers every picker category', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing = WIDGET_CATEGORIES.map((c) => `dashboard.categories.${c.key}`).filter(
        (k) => !keyExists(catalog, k),
      );
      expect(missing, `${localeName} categories`).toEqual([]);
    }
  });

  it('covers every allowlisted activity kind', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing = ACTIVITY_KINDS.map(
        (kind) => `dashboard.activity.kinds.${activityKindKey(kind)}`,
      ).filter((k) => !keyExists(catalog, k));
      expect(missing, `${localeName} activity kinds`).toEqual([]);
    }
  });

  it('covers the four count tiles with a hint', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing = (['backlog', 'todo', 'inProgress', 'done'] as const)
        .map((k) => `dashboard.tiles.${k}.hint`)
        .filter((k) => !keyExists(catalog, k));
      expect(missing, `${localeName} tile hints`).toEqual([]);
    }
  });

  it('covers every landing greeting window and every subgreeting index', () => {
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const w of GREETING_WINDOWS) {
        const key = `dashboard.landing.greetings.${w.timeOfDay}`;
        if (!keyExists(catalog, key)) missing.push(key);
      }
      for (let i = 0; i < SUBGREETINGS.length; i++) {
        const key = `dashboard.landing.subgreetings.${i}`;
        if (!keyExists(catalog, key)) missing.push(key);
      }
      expect(missing, `${localeName} landing copy`).toEqual([]);
    }
  });

  it('covers the enum-ish families looked up by template literal', () => {
    const families: Array<[string, readonly string[]]> = [
      ['dashboard.clockMode', ['digital', 'analogue']],
      ['dashboard.cycleTime.groupBy', ['none', 'repo', 'project', 'priority']],
      ['dashboard.fleetTrend.series', ['queueDepth', 'slotsUsed', 'tickLatencyMs']],
      ['dashboard.news.layout', ['list', 'grid']],
      [
        'dashboard.weather.codes',
        [
          'clear',
          'partlyCloudy',
          'overcast',
          'fog',
          'drizzle',
          'rain',
          'snow',
          'rainShowers',
          'snowShowers',
          'thunderstorm',
        ],
      ],
      [
        'dashboard.usage.features',
        [
          'classifier',
          'planner',
          'project',
          'agent',
          'council',
          'workflow',
          'chat',
          'memory',
          'memory-chat',
          'retro',
          'digest',
          'assistant',
          'unknown',
        ],
      ],
      ['common.units.bytes', ['b', 'kb', 'mb', 'gb', 'tb', 'pb']],
      ['common.units.duration', ['seconds', 'minutes', 'hours', 'days']],
    ];
    for (const [localeName, catalog] of CATALOGS) {
      const missing: string[] = [];
      for (const [prefix, keys] of families) {
        for (const k of keys) {
          if (!keyExists(catalog, `${prefix}.${k}`)) missing.push(`${prefix}.${k}`);
        }
      }
      expect(missing, `${localeName} template-literal families`).toEqual([]);
    }
  });

  // A cheap cross-check that the slice didn't leave a half-populated subtree: every
  // en-GB `dashboard` leaf must exist in fr-FR. The parity validator enforces this
  // globally, but a failure here names the offending key.
  it('has no en-GB-only key under dashboard', () => {
    const leaves: string[] = [];
    const walk = (prefix: string, node: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(node)) {
        const key = `${prefix}.${k}`;
        if (v && typeof v === 'object') walk(key, v as Record<string, unknown>);
        else leaves.push(key);
      }
    };
    walk('dashboard', (enGB as Record<string, unknown>)['dashboard'] as Record<string, unknown>);
    expect(leaves.length).toBeGreaterThan(400);
    expect(leaves.filter((k) => !keyExists(frFR as Record<string, unknown>, k))).toEqual([]);
  });
});
