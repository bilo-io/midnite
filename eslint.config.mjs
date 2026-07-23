import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import i18next from 'eslint-plugin-i18next';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

import { I18N_EXEMPT } from './eslint.i18n-exempt.mjs';

// Phase 82 A — the no-hardcoded-string gate is **default-on** for every `.tsx` in
// `packages/web` + `packages/shell/src`; a file is unenforced only while it's on the
// generated `I18N_EXEMPT` tail (see scripts/i18n-exempt.mjs). New files are therefore
// born enforced, and each migration slice shrinks the list toward zero. Test/story
// fixtures are excluded below (they carry deliberate literal strings for assertions).
const I18N_GATED = ['packages/web/**/*.tsx', 'packages/shell/src/**/*.tsx'];
const I18N_NON_COPY = ['**/*.test.tsx', '**/*.spec.tsx', '**/*.stories.tsx'];
// Next.js dynamic-route dirs contain `[param]`; as a glob pattern the brackets read
// as a character class, so a raw exempt path would never match its own file. Escape
// them (the exempt list stays real, readable paths — escaping happens only here).
const escapeGlob = (p) => p.replace(/[[\]]/g, '\\$&');

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/out/**',
      '**/build/**',
      '**/build-staging/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/node_modules/**',
      'packages/gateway/drizzle/**',
      '**/*.stories.tsx',
      '**/*.stories.ts',
      // Next-generated, not ours to lint.
      '**/next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript/TSX sources — node + browser globals cover both gateway and web.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Committed code uses structured logging / CLI output helpers; bare
      // console is opt-in via an inline disable (the codebase already does this).
      'no-console': 'error',
      // Allow intentionally-unused args prefixed with _ (common in stubs/handlers).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Best-effort cleanup catches (e.g. unlink on a temp file) are intentional.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Dependency-free CJS hook scripts + build/config scripts: require() + console ok.
  {
    files: ['**/*.cjs', '**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off',
    },
  },

  // The CLI prints to stdout/stderr — console IS its output channel.
  {
    files: ['packages/cli/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // The PWA service worker runs in the ServiceWorkerGlobalScope (self, caches,
  // clients, fetch, …), not a node/window context.
  {
    files: ['**/public/sw.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },

  // i18n no-hardcoded-string gate (Phase 82 A) — default-on across web + shell/src,
  // exempting only the generated tail + test/story fixtures. `jsx-text-only` targets
  // visible copy (JSX text) and ignores structural attributes (className, data-*,
  // aria/role) so it doesn't flag non-copy.
  {
    files: I18N_GATED,
    ignores: [...I18N_NON_COPY, ...I18N_EXEMPT.map(escapeGlob)],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },

  // Keep ESLint out of Prettier's lane (formatting rules disabled).
  prettier,
);
