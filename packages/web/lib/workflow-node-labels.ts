import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { NodeField, NodeFieldOption, NodeTypeDefinition, PortSpec } from '@midnite/shared';

/**
 * The node-catalogue i18n seam (Phase 82 Theme D).
 *
 * `NODE_TYPE_DEFINITIONS` in `@midnite/shared` carries ~130 English strings (node
 * `title`/`description`, port `label`s, and each field's `label`/`placeholder`/`help`
 * and select-option labels). `shared` is **i18n-agnostic by rule** — the gateway's
 * executor registry reads the same definitions — so those strings stay put and stay
 * canonical. Translation happens **here, at the web call site, by key convention**,
 * with the shared English as the per-key fallback:
 *
 * ```text
 * workflows.nodes.<node>.title
 * workflows.nodes.<node>.description
 * workflows.nodes.<node>.ports.<port>                        (only ports that carry a label)
 * workflows.nodes.<node>.fields.<field>.label
 * workflows.nodes.<node>.fields.<field>.placeholder           (where the definition has one)
 * workflows.nodes.<node>.fields.<field>.help                 (where the definition has one)
 * workflows.nodes.<node>.fields.<field>.options.<optionValue> (select options)
 * ```
 *
 * **Key escaping.** Node ids and some option values contain dots (`trigger.manual`,
 * `http.request`, `digest.generated`) and a dot is next-intl's key *separator*, so a
 * raw id would address a nested namespace that doesn't exist. Every id-ish segment is
 * therefore passed through {@link nodeKeySegment}, which replaces `.` with `_`
 * (`trigger.manual` → `trigger_manual`) and maps the empty string (the AI node's
 * "follow the active provider" option) to `_empty`. Nothing else in the app should
 * hand-write that transform — go through the helper so the catalog and the lookups
 * can't drift.
 *
 * **Fallback.** Every resolver checks `t.has(key)` first and returns the shared
 * English when the key is absent, so a node added to `shared` renders (in English)
 * before its catalog copy lands — never a raw key path and never a thrown error.
 *
 * **ICU note.** Catalog values quote literal `{{ … }}` spans (`'{{ }}'`) so
 * intl-messageformat renders the expression syntax verbatim instead of treating the
 * braces as arguments. Expression syntax, helper names and path tokens are a machine
 * language — they are copied, never translated.
 */

/**
 * Escape one id-ish key segment: dots become underscores (dots are next-intl key
 * separators) and the empty option value becomes `_empty`.
 */
export function nodeKeySegment(id: string): string {
  return id === '' ? '_empty' : id.replaceAll('.', '_');
}

export type NodeLabels = {
  /** Node title (palette entry, config-panel subtitle, canvas node header). */
  title: (def: NodeTypeDefinition) => string;
  /** Node description (palette tooltip / search corpus). */
  description: (def: NodeTypeDefinition) => string;
  /** Config-form field label (also used for the ƒx toggle's accessible name). */
  fieldLabel: (def: NodeTypeDefinition, field: NodeField) => string;
  /** Field placeholder — `undefined` when the definition declares none. */
  fieldPlaceholder: (def: NodeTypeDefinition, field: NodeField) => string | undefined;
  /** Field help text — `undefined` when the definition declares none. */
  fieldHelp: (def: NodeTypeDefinition, field: NodeField) => string | undefined;
  /** Select-option label for one of a field's `options`. */
  optionLabel: (def: NodeTypeDefinition, field: NodeField, option: NodeFieldOption) => string;
  /** Port label — `undefined` when the port carries no label (the unnamed `main` ports). */
  portLabel: (def: NodeTypeDefinition, port: PortSpec) => string | undefined;
};

/**
 * Translated copy for a shared node definition, falling back per key to the English
 * in `@midnite/shared`. One hook so the palette, the generic config form and the
 * canvas node view all read the same keys.
 */
export function useNodeLabels(): NodeLabels {
  const t = useTranslations('workflows');

  return useMemo(() => {
    /** `t(key)` when the catalog has it, else the shared English. */
    const resolve = (key: string, fallback: string): string => (t.has(key) ? t(key) : fallback);
    const nodeKey = (def: NodeTypeDefinition) => `nodes.${nodeKeySegment(def.id)}`;
    const fieldKey = (def: NodeTypeDefinition, field: NodeField) =>
      `${nodeKey(def)}.fields.${nodeKeySegment(field.key)}`;

    return {
      title: (def) => resolve(`${nodeKey(def)}.title`, def.title),
      description: (def) => resolve(`${nodeKey(def)}.description`, def.description),
      fieldLabel: (def, field) => resolve(`${fieldKey(def, field)}.label`, field.label),
      fieldPlaceholder: (def, field) =>
        field.placeholder === undefined
          ? undefined
          : resolve(`${fieldKey(def, field)}.placeholder`, field.placeholder),
      fieldHelp: (def, field) =>
        field.help === undefined ? undefined : resolve(`${fieldKey(def, field)}.help`, field.help),
      optionLabel: (def, field, option) =>
        resolve(
          `${fieldKey(def, field)}.options.${nodeKeySegment(option.value)}`,
          option.label,
        ),
      portLabel: (def, port) =>
        port.label === undefined
          ? undefined
          : resolve(`${nodeKey(def)}.ports.${nodeKeySegment(port.name)}`, port.label),
    };
  }, [t]);
}
