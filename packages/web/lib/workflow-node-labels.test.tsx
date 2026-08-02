import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import {
  listNodeTypes,
  NODE_TYPE_DEFINITIONS,
  TASK_EVENT_TRIGGER_EVENTS,
  type NodeTypeDefinition,
} from '@midnite/shared';

import enGB from '@/messages/en-GB';
import frFR from '@/messages/fr-FR';
import { DAY_LABELS } from './cron';
import { nodeKeySegment, useNodeLabels, type NodeLabels } from './workflow-node-labels';

/**
 * The node-catalogue i18n seam (Phase 82 Theme D). The catalogue is keyed by the
 * *escaped* shared node id, and every resolver falls back to the shared English so a
 * node added to `@midnite/shared` renders before its copy lands. These specs pin all
 * three halves: the escaping, the catalogue hit, and the fallback.
 *
 * The provider is mounted directly (rather than via `vitest.render-intl`) so a spec can
 * hand it a deliberately-incomplete catalogue and observe the fallback path.
 */
function labelsAt(
  messages: Record<string, unknown>,
  locale = 'en-GB',
): NodeLabels {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages} onError={() => {}}>
        {children}
      </NextIntlClientProvider>
    );
  }
  return renderHook(() => useNodeLabels(), { wrapper: Wrapper }).result.current;
}

const def = (id: string): NodeTypeDefinition => {
  const found = NODE_TYPE_DEFINITIONS[id];
  if (!found) throw new Error(`no such node type: ${id}`);
  return found;
};

const fieldOf = (id: string, key: string) => {
  const found = def(id).fields.find((f) => f.key === key);
  if (!found) throw new Error(`no such field: ${id}.${key}`);
  return found;
};

describe('nodeKeySegment', () => {
  it('replaces the dots that next-intl would read as key separators', () => {
    expect(nodeKeySegment('trigger.manual')).toBe('trigger_manual');
    expect(nodeKeySegment('http.request')).toBe('http_request');
    expect(nodeKeySegment('midnite.list-completed-tasks')).toBe('midnite_list-completed-tasks');
    expect(nodeKeySegment('digest.generated')).toBe('digest_generated');
  });

  it('leaves a dot-free segment alone and names the empty option value', () => {
    expect(nodeKeySegment('credentialId')).toBe('credentialId');
    expect(nodeKeySegment('')).toBe('_empty');
  });
});

describe('useNodeLabels — a present key wins', () => {
  const labels = labelsAt(enGB as Record<string, unknown>);

  it('resolves the catalogue copy for a node, its fields, options and ports', () => {
    expect(labels.title(def('http.request'))).toBe('HTTP Request');
    expect(labels.description(def('http.request'))).toBe('Make an outbound HTTP call.');
    expect(labels.fieldLabel(def('http.request'), fieldOf('http.request', 'url'))).toBe('URL');
    expect(labels.fieldPlaceholder(def('http.request'), fieldOf('http.request', 'body'))).toBe(
      'Raw request body',
    );
    expect(labels.fieldHelp(def('http.request'), fieldOf('http.request', 'headers'))).toBe(
      'JSON object of header name → value.',
    );
    const operator = fieldOf('logic.branch', 'operator');
    expect(
      labels.optionLabel(def('logic.branch'), operator, { value: 'gte', label: 'x' }),
    ).toBe('≥ greater or equal');
    expect(labels.portLabel(def('logic.branch'), { name: 'true', label: 'x' })).toBe('True');
  });

  it('renders literal {{ }} expression syntax verbatim through ICU', () => {
    // The catalogue quotes the braces so intl-messageformat does not read them as
    // arguments — expression syntax is a machine language, copied not translated.
    expect(labels.description(def('logic.setData'))).toBe(
      'Build a payload from fields, using {{ }} to pull from upstream nodes.',
    );
    expect(labels.fieldHelp(def('storage.set'), fieldOf('storage.set', 'value'))).toBe(
      'The value to store. Use {{ }} to pull from upstream nodes.',
    );
  });

  it('translates the same definitions under fr-FR', () => {
    const fr = labelsAt(frFR as Record<string, unknown>, 'fr-FR');
    expect(fr.title(def('http.request'))).toBe('Requête HTTP');
    expect(fr.fieldLabel(def('http.request'), fieldOf('http.request', 'headers'))).toBe('En-têtes');
    expect(fr.portLabel(def('logic.branch'), { name: 'false', label: 'x' })).toBe('Faux');
  });
});

describe('useNodeLabels — a missing key falls back to the shared English', () => {
  // An empty catalogue stands in for a node whose copy has not landed yet.
  const labels = labelsAt({ workflows: { nodes: {} } });

  it('falls back for every resolver rather than throwing or leaking a key path', () => {
    const d = def('http.request');
    expect(labels.title(d)).toBe(d.title);
    expect(labels.description(d)).toBe(d.description);
    const url = fieldOf('http.request', 'url');
    expect(labels.fieldLabel(d, url)).toBe(url.label);
    expect(labels.fieldPlaceholder(d, url)).toBe(url.placeholder);
    const credential = fieldOf('http.request', 'credentialId');
    expect(labels.fieldHelp(d, credential)).toBe(credential.help);
    const method = fieldOf('http.request', 'method');
    expect(labels.optionLabel(d, method, { value: 'GET', label: 'GET' })).toBe('GET');
    expect(labels.portLabel(def('logic.branch'), { name: 'true', label: 'True' })).toBe('True');
  });

  it('reports undefined for a field the definition gives no placeholder/help', () => {
    const method = fieldOf('http.request', 'method');
    expect(labels.fieldPlaceholder(def('http.request'), method)).toBeUndefined();
    expect(labels.fieldHelp(def('http.request'), method)).toBeUndefined();
    // …and for an unlabelled port (the plain `main` in/out).
    expect(labels.portLabel(def('http.request'), { name: 'main' })).toBeUndefined();
  });

  it('falls back for a node type that is not in the catalogue at all', () => {
    const invented: NodeTypeDefinition = {
      ...def('http.request'),
      id: 'brand.new-node',
      title: 'Brand New',
      description: 'Not translated yet.',
    };
    expect(labels.title(invented)).toBe('Brand New');
    expect(labels.description(invented)).toBe('Not translated yet.');
  });
});

describe('the en-GB catalogue covers the whole shared registry', () => {
  const labels = labelsAt(enGB as Record<string, unknown>);
  const catalogNodes = (enGB as { workflows: { nodes: Record<string, unknown> } }).workflows.nodes;

  it('has a title + description for each of the 22 node types', () => {
    const defs = listNodeTypes();
    expect(defs).toHaveLength(22);
    const missing = defs.filter((d) => !(nodeKeySegment(d.id) in catalogNodes)).map((d) => d.id);
    expect(missing, 'node ids with no catalogue entry').toEqual([]);
    for (const d of defs) {
      // A hit resolves to the shared English *verbatim* — en-GB is a copy, not a
      // paraphrase — which doubles as a guard on the ICU escaping.
      expect(labels.title(d), `${d.id}.title`).toBe(d.title);
      expect(labels.description(d), `${d.id}.description`).toBe(d.description);
    }
  });

  it('has copy for every field, select option and labelled port', () => {
    // Fallback would silently paper over a gap, so compare against the raw catalogue.
    const has = (dotted: string): boolean => {
      let node: unknown = catalogNodes;
      for (const part of dotted.split('.')) {
        if (!node || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) {
          return false;
        }
        node = (node as Record<string, unknown>)[part];
      }
      return typeof node === 'string';
    };
    const missing: string[] = [];
    for (const d of listNodeTypes()) {
      const n = nodeKeySegment(d.id);
      for (const port of [...d.inputs, ...d.outputs]) {
        if (port.label && !has(`${n}.ports.${nodeKeySegment(port.name)}`)) {
          missing.push(`${n}.ports.${port.name}`);
        }
      }
      for (const f of d.fields) {
        const base = `${n}.fields.${nodeKeySegment(f.key)}`;
        if (!has(`${base}.label`)) missing.push(`${base}.label`);
        if (f.placeholder && !has(`${base}.placeholder`)) missing.push(`${base}.placeholder`);
        if (f.help && !has(`${base}.help`)) missing.push(`${base}.help`);
        for (const o of f.options ?? []) {
          const key = `${base}.options.${nodeKeySegment(o.value)}`;
          if (!has(key)) missing.push(key);
        }
      }
    }
    expect(missing, 'shared node copy with no catalogue key').toEqual([]);
  });
});

/**
 * Static guard that every `t()` key the two seam consumers reference resolves in the
 * en-GB catalog, mirroring `i18n-memory-keys.test.ts`. fr-FR parity is enforced
 * separately by `i18n-validate` (fr-FR is a `complete` locale), so an en hit implies a
 * fr hit. Template-literal lookups (`categories.${category}`, `presets.${mode}`,
 * `events.${nodeKeySegment(event)}`, `days.${i}`) are swept from the enums below,
 * since the regex can't see them.
 */
describe('Phase 82 D — workflow palette + config chrome keys resolve in en-GB', () => {
  const catalog = enGB as Record<string, unknown>;
  const keyExists = (dotted: string): boolean => {
    let node: unknown = catalog;
    for (const part of dotted.split('.')) {
      if (!node || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) {
        return false;
      }
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string';
  };

  const FILES = ['components/node-palette.tsx', 'components/node-config-panel.tsx'];
  // `const <name> = useTranslations('ns')` — ns may be deeply nested.
  const BIND_RE = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*useTranslations\(\s*'([^']+)'\s*\)/g;

  for (const rel of FILES) {
    it(`resolves every literal t() key in ${rel}`, () => {
      const src = readFileSync(join(__dirname, '..', rel), 'utf8');
      // Several components in one file each bind `t` to a *different* namespace, so a
      // key is only unresolved when it misses under every namespace that name is
      // bound to — the sub-component that owns it is whichever one resolves.
      const namespacesByName = new Map<string, string[]>();
      for (const m of src.matchAll(BIND_RE)) {
        namespacesByName.set(m[1]!, [...(namespacesByName.get(m[1]!) ?? []), m[2]!]);
      }
      expect(namespacesByName.size, `no useTranslations binding in ${rel}`).toBeGreaterThan(0);
      const missing: string[] = [];
      for (const [name, namespaces] of namespacesByName) {
        const callRe = new RegExp(`\\b${name}(?:\\.rich)?\\(\\s*['"]([a-zA-Z][\\w.-]*)['"]`, 'g');
        for (const m of src.matchAll(callRe)) {
          if (!namespaces.some((ns) => keyExists(`${ns}.${m[1]}`))) {
            missing.push(`${namespaces.join('|')}.${m[1]}`);
          }
        }
      }
      expect(missing, `unresolved keys in ${rel}`).toEqual([]);
    });
  }

  it('covers every palette category, trigger tab, recurrence preset, day and task event', () => {
    for (const category of ['action', 'logic', 'data', 'storage']) {
      expect(keyExists(`workflows.palette.categories.${category}`)).toBe(true);
    }
    for (const type of ['manual', 'schedule', 'webhook', 'task-event']) {
      expect(keyExists(`workflows.config.trigger.tabs.${type}`)).toBe(true);
    }
    for (const mode of ['daily', 'weekdays', 'weekly', 'monthly', 'custom']) {
      expect(keyExists(`workflows.config.trigger.schedule.presets.${mode}`)).toBe(true);
    }
    for (let i = 0; i < DAY_LABELS.length; i += 1) {
      expect(keyExists(`workflows.config.trigger.schedule.days.${i}`)).toBe(true);
    }
    for (const event of TASK_EVENT_TRIGGER_EVENTS) {
      const key = `workflows.config.trigger.taskEvent.events.${nodeKeySegment(event)}`;
      expect(keyExists(key), key).toBe(true);
    }
  });
});
