# Message catalogs (i18n)

next-intl message catalogs for `web` (Phase 79; split per namespace in Phase 82 A).
**`en-GB` is canonical** — every key originates here. Other locales fall back to it
per-key via the shell `LocaleProvider`, so a missing key renders the English source,
never a raw key.

## Layout

Catalogs are **split per namespace** so parallel migration slices don't collide in
one big file:

```text
messages/
  en-GB/                # canonical — add every new key here first
    common.json  nav.json  auth.json  board.json  settings.json  …
    index.ts            # GENERATED barrel (do not edit) — merges the fragments
  fr-FR/                # fully hand-translated; kept at FULL key parity with en-GB
    common.json … settings.json
    index.ts            # GENERATED
  de-DE/  es-ES/        # intentionally EMPTY (no fragments) — fall back to en-GB
    index.ts            # GENERATED → `export default {}`
  meta/
    <locale>.json       # sidecar metadata (one file per locale, NOT split)
```

- Each `messages/<locale>/index.ts` is **generated** by
  [`scripts/i18n-barrels.mjs`](../../../scripts/i18n-barrels.mjs): it statically
  imports every `*.json` fragment and default-exports the merged, namespace-keyed
  tree. The runtime ([`i18n/messages.ts`](../../i18n/messages.ts)) imports the four
  barrels, so the whole catalog still bundles under `output: 'export'` (no server,
  no request-time resolution). **Never hand-edit a barrel** — add/remove a fragment
  and run `moon run web:i18n-barrels`.
- `de-DE` / `es-ES` are intentionally **empty** for now; they fall back to en-GB
  until translated (deferred MT-seed).
- `meta/<locale>.json` — sidecar metadata (kept as one file per locale, not split):
  `{ "complete": boolean, "needsReview": string[] }`. `complete: true` opts a locale
  into the parity gate; `needsReview` flags machine/placeholder strings a human
  should still check.

Keys are **nested by namespace** (`nav`, `settings`, `board`, `auth`, `common`, …);
components read one namespace via `useTranslations('nav')` and call `t('features.tasks')`.
Feature slices (Phase 82 B–E) add their own namespace file (e.g. `workflows.json`).

## The lint gate (default-on — Phase 82 A)

`i18next/no-literal-string` (`jsx-text-only`) now errors on **every** `.tsx` under
`packages/web` + `packages/shell/src`, **except**:

- test/story fixtures (`*.test.tsx`, `*.spec.tsx`, `*.stories.tsx`), and
- files on the generated exempt tail,
  [`eslint.i18n-exempt.mjs`](../../../eslint.i18n-exempt.mjs).

So **new files are born enforced**. Each migration slice deletes its files from the
exempt list; the list's length is the phase's **progress meter** (printed by
`web:i18n-validate`). Regenerate/prune the list with `node scripts/i18n-exempt.mjs`
(it is **removal-only** — it never re-exempts a file, so a migrated surface can't
silently regress).

> **Known gap:** Phaser canvas text in the office scenes is **not** localized and
> stays English (a documented Phase 82 scope decision) — canvas strings are invisible
> to the lint gate.

## Tooling

- **`moon run web:i18n-validate`** ([`scripts/i18n-validate.mjs`](../../../scripts/i18n-validate.mjs)) —
  the key-parity gate + progress meter, run in `moon ci`. Fails on **orphan keys** (a
  key in a locale not in en-GB) and on **missing keys in a `complete` locale**
  (fr-FR). Prints per-namespace key totals + the exempt-file count.
- **`moon run web:i18n-barrels`** (`--check` in CI) — regenerates / verifies the
  per-locale barrels against the fragments on disk.
- **`moon run web:i18n-exempt`** (`--check` in CI) — prunes / verifies the exempt
  list (fails on a stale entry whose file was renamed or deleted).
- **`node scripts/i18n-extract.mjs [locale]`** — prints the canonical keys still
  missing from a locale (the translation worklist). Read-only.

## Adding / changing copy

1. Add or edit the key in `en-GB/<namespace>.json` (create the namespace file if new,
   then `moon run web:i18n-barrels`).
2. Mirror it in `fr-FR/<namespace>.json` (fr-FR is `complete` — the gate enforces
   parity, and a test blocks demoting it to skip the check).
3. Use it via `useTranslations('<namespace>')` → `t('<key>')`; dynamic values use ICU
   args (`t('continueWith', { provider })`), dates/numbers use `useLocaleFormat`.
4. Remove the migrated file(s) from `eslint.i18n-exempt.mjs`.
5. `moon run web:i18n-validate`, `web:i18n-barrels`, `web:i18n-exempt` and `web:lint`
   must stay green.
