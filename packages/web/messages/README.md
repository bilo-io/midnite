# Message catalogs (i18n)

next-intl message catalogs for `web` (Phase 79). **`en-GB` is canonical** — every
key originates here. Other locales fall back to it per-key via the shell
`LocaleProvider`, so a missing key renders the English source, never a raw key.

## Layout

- `en-GB.json` — canonical source. Add every new key here first.
- `fr-FR.json` — fully hand-translated; kept at **full key parity** with en-GB.
- `de-DE.json` / `es-ES.json` — intentionally **empty** for now; they fall back to
  en-GB until translated (Theme E follow-up / MT-seed).
- `meta/<locale>.json` — sidecar metadata (not a catalog, so next-intl never sees
  it): `{ "complete": boolean, "needsReview": string[] }`. `complete: true` opts a
  locale into the parity gate; `needsReview` flags machine/placeholder strings a
  human should still check.

Keys are **nested by namespace** (`nav`, `settings`, `board`, `auth`, `common`, …);
components read one namespace via `useTranslations('nav')` and call `t('features.tasks')`.

## Tooling (Phase 79 E)

- **`moon run web:i18n-validate`** ([`scripts/i18n-validate.mjs`](../../../scripts/i18n-validate.mjs)) —
  the key-parity gate, run in `moon ci`. Fails on **orphan keys** (a key in a locale
  not in en-GB — a typo or a stale key after a rename) and on **missing keys in a
  `complete` locale** (fr-FR). Empty/partial locales are reported for coverage only.
- **`node scripts/i18n-extract.mjs [locale]`** — prints the canonical keys still
  missing from a locale (the translation worklist). Read-only.
- **ESLint `i18next/no-literal-string`** (in [`eslint.config.mjs`](../../../eslint.config.mjs),
  `I18N_ENFORCED`) — errors on new hardcoded JSX text, but **only on already-migrated
  files**, so the un-migrated long tail converts incrementally without a big-bang. A
  file joins `I18N_ENFORCED` once its visible copy is externalized.

## Adding / changing copy

1. Add or edit the key in `en-GB.json`.
2. Mirror it in `fr-FR.json` (it's `complete` — the gate enforces parity).
3. Use it via `useTranslations('<namespace>')` → `t('<key>')`; dynamic values use
   ICU args (`t('continueWith', { provider })`), dates/numbers use `useLocaleFormat`.
4. `moon run web:i18n-validate` must stay green.
